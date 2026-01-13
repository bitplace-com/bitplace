/**
 * Streaming fetch utility for SSE-based edge function calls
 * Used for real-time progress updates during validate/commit operations
 */

export interface ProgressEvent {
  type: 'progress';
  phase: 'validate' | 'commit';
  processed: number;
  total: number;
}

export interface DoneEvent<T> {
  type: 'done';
  result: T;
}

export interface ErrorEvent {
  type: 'error';
  error: string;
  message?: string;
}

export type StreamEvent<T> = ProgressEvent | DoneEvent<T> | ErrorEvent;

export interface StreamingInvokeOptions {
  onProgress: (processed: number, total: number) => void;
}

/**
 * Invoke an edge function with SSE streaming for progress updates
 * Falls back to regular response parsing if non-streaming response is received
 */
// Timeout for edge function calls (30s to handle cold starts)
const STREAM_TIMEOUT_MS = 30000;

export async function streamingInvoke<T>(
  functionName: string,
  body: object,
  headers: Record<string, string>,
  options: StreamingInvokeOptions
): Promise<{ data: T | null; error: Error | null }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const url = `${supabaseUrl}/functions/v1/${functionName}`;

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({ ...body, stream: true }),
    });

    clearTimeout(timeoutId);

    // Handle error responses
    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorBody = await response.json();
        return { data: errorBody as T, error: null }; // Return error body for caller to handle
      } catch {
        return { data: null, error: new Error(errorMessage) };
      }
    }

    const contentType = response.headers.get('content-type') || '';
    
    // If SSE stream
    if (contentType.includes('text/event-stream')) {
      return await parseSSEStream<T>(response, options);
    }
    
    // Fallback to regular JSON response
    const data = await response.json();
    return { data: data as T, error: null };
  } catch (err) {
    clearTimeout(timeoutId);
    
    // Handle abort/timeout specifically
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn('[streamingInvoke] Request timed out after', STREAM_TIMEOUT_MS, 'ms');
      return { 
        data: null, 
        error: new Error('Request timed out. Please try again.') 
      };
    }
    
    console.error('[streamingInvoke] Error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error(String(err)) 
    };
  }
}

/**
 * Parse SSE stream and extract progress + final result
 */
async function parseSSEStream<T>(
  response: Response,
  options: StreamingInvokeOptions
): Promise<{ data: T | null; error: Error | null }> {
  const reader = response.body?.getReader();
  if (!reader) {
    return { data: null, error: new Error('No response body') };
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let result: T | null = null;
  let streamError: Error | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Parse SSE events (format: "data: {...}\n\n")
      const events = buffer.split('\n\n');
      // Keep the last incomplete chunk in buffer
      buffer = events.pop() || '';
      
      for (const eventText of events) {
        if (!eventText.trim()) continue;
        
        // Handle multi-line SSE events
        const lines = eventText.split('\n');
        let eventData = '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            eventData += line.slice(6);
          }
        }
        
        if (!eventData) continue;
        
        try {
          const event = JSON.parse(eventData) as StreamEvent<T>;
          
          if (event.type === 'progress') {
            options.onProgress(event.processed, event.total);
          } else if (event.type === 'done') {
            result = event.result;
          } else if (event.type === 'error') {
            streamError = new Error(event.message || event.error);
          }
        } catch (parseError) {
          console.warn('[parseSSEStream] Failed to parse event:', eventData, parseError);
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      const lines = buffer.split('\n');
      let eventData = '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          eventData += line.slice(6);
        }
      }
      if (eventData) {
        try {
          const event = JSON.parse(eventData) as StreamEvent<T>;
          if (event.type === 'done') {
            result = event.result;
          } else if (event.type === 'error') {
            streamError = new Error(event.message || event.error);
          }
        } catch {
          // Ignore parse errors for trailing data
        }
      }
    }

    if (streamError) {
      return { data: null, error: streamError };
    }

    return { data: result, error: null };
  } catch (err) {
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error(String(err)) 
    };
  } finally {
    reader.releaseLock();
  }
}
