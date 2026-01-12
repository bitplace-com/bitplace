import { ComponentType, SVGProps } from 'react';

// Custom pixel icons
import { PixelHand } from './custom/PixelHand';
import { PixelBrush } from './custom/PixelBrush';
import { PixelSingle } from './custom/PixelSingle';
import { PixelGrid2x2 } from './custom/PixelGrid2x2';
import { PixelEraser } from './custom/PixelEraser';
import { PixelShield } from './custom/PixelShield';
import { PixelSwords } from './custom/PixelSwords';
import { PixelBolt } from './custom/PixelBolt';
import { PixelPlus } from './custom/PixelPlus';
import { PixelMinus } from './custom/PixelMinus';
import { PixelEye } from './custom/PixelEye';
import { PixelEyeOff } from './custom/PixelEyeOff';
import { PixelBell } from './custom/PixelBell';
import { PixelSearch } from './custom/PixelSearch';
import { PixelTrophy } from './custom/PixelTrophy';
import { PixelGlobe } from './custom/PixelGlobe';
import { PixelSettings } from './custom/PixelSettings';
import { PixelCart } from './custom/PixelCart';
import { PixelMenu } from './custom/PixelMenu';
import { PixelUsers } from './custom/PixelUsers';
import { PixelUser } from './custom/PixelUser';
import { PixelBook } from './custom/PixelBook';
import { PixelMap } from './custom/PixelMap';
import { PixelSun } from './custom/PixelSun';
import { PixelMoon } from './custom/PixelMoon';
import { PixelChevronUp } from './custom/PixelChevronUp';
import { PixelChevronDown } from './custom/PixelChevronDown';
import { PixelChevronLeft } from './custom/PixelChevronLeft';
import { PixelChevronRight } from './custom/PixelChevronRight';
import { PixelCheck } from './custom/PixelCheck';
import { PixelClose } from './custom/PixelClose';
import { PixelPipette } from './custom/PixelPipette';
import { PixelUndo } from './custom/PixelUndo';
import { PixelTrash } from './custom/PixelTrash';
import { PixelLoader } from './custom/PixelLoader';
import { PixelAlert } from './custom/PixelAlert';
import { PixelInfo } from './custom/PixelInfo';
import { PixelWallet } from './custom/PixelWallet';
import { PixelHeart } from './custom/PixelHeart';
import { PixelRefresh } from './custom/PixelRefresh';
import { PixelSkull } from './custom/PixelSkull';
import { PixelPin } from './custom/PixelPin';
import { PixelClock } from './custom/PixelClock';
import { PixelStar } from './custom/PixelStar';
import { PixelPencil } from './custom/PixelPencil';
import { PixelNavigation } from './custom/PixelNavigation';
import { PixelChart } from './custom/PixelChart';
import { PixelBug } from './custom/PixelBug';
import { PixelArrowLeft } from './custom/PixelArrowLeft';
import { PixelTrendingDown } from './custom/PixelTrendingDown';
import { PixelTwitter } from './custom/PixelTwitter';
import { PixelInstagram } from './custom/PixelInstagram';
import { PixelShare } from './custom/PixelShare';
import { PixelExternalLink } from './custom/PixelExternalLink';
import { PixelSmartphone } from './custom/PixelSmartphone';
import { PixelCopy } from './custom/PixelCopy';
import { PixelLogout } from './custom/PixelLogout';
import { PixelVolumeOn } from './custom/PixelVolumeOn';
import { PixelVolumeOff } from './custom/PixelVolumeOff';

export type IconName =
  | 'hand'
  | 'brush'
  | 'pixel'
  | 'grid2x2'
  | 'eraser'
  | 'shield'
  | 'swords'
  | 'bolt'
  | 'plus'
  | 'minus'
  | 'eye'
  | 'eyeOff'
  | 'bell'
  | 'search'
  | 'trophy'
  | 'globe'
  | 'settings'
  | 'cart'
  | 'menu'
  | 'users'
  | 'user'
  | 'book'
  | 'map'
  | 'sun'
  | 'moon'
  | 'chevronUp'
  | 'chevronDown'
  | 'chevronLeft'
  | 'chevronRight'
  | 'check'
  | 'close'
  | 'pipette'
  | 'undo'
  | 'trash'
  | 'loader'
  | 'alert'
  | 'info'
  | 'wallet'
  | 'heart'
  | 'refresh'
  | 'skull'
  | 'pin'
  | 'clock'
  | 'star'
  | 'pencil'
  | 'navigation'
  | 'chart'
  | 'bug'
  | 'arrowLeft'
  | 'trendingDown'
  | 'twitter'
  | 'instagram'
  | 'share'
  | 'externalLink'
  | 'smartphone'
  | 'copy'
  | 'logout'
  | 'volumeOn'
  | 'volumeOff';

type PixelIconComponent = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

export const icons: Record<IconName, PixelIconComponent> = {
  hand: PixelHand,
  brush: PixelBrush,
  pixel: PixelSingle,
  grid2x2: PixelGrid2x2,
  eraser: PixelEraser,
  shield: PixelShield,
  swords: PixelSwords,
  bolt: PixelBolt,
  plus: PixelPlus,
  minus: PixelMinus,
  eye: PixelEye,
  eyeOff: PixelEyeOff,
  bell: PixelBell,
  search: PixelSearch,
  trophy: PixelTrophy,
  globe: PixelGlobe,
  settings: PixelSettings,
  cart: PixelCart,
  menu: PixelMenu,
  users: PixelUsers,
  user: PixelUser,
  book: PixelBook,
  map: PixelMap,
  sun: PixelSun,
  moon: PixelMoon,
  chevronUp: PixelChevronUp,
  chevronDown: PixelChevronDown,
  chevronLeft: PixelChevronLeft,
  chevronRight: PixelChevronRight,
  check: PixelCheck,
  close: PixelClose,
  pipette: PixelPipette,
  undo: PixelUndo,
  trash: PixelTrash,
  loader: PixelLoader,
  alert: PixelAlert,
  info: PixelInfo,
  wallet: PixelWallet,
  heart: PixelHeart,
  refresh: PixelRefresh,
  skull: PixelSkull,
  pin: PixelPin,
  clock: PixelClock,
  star: PixelStar,
  pencil: PixelPencil,
  navigation: PixelNavigation,
  chart: PixelChart,
  bug: PixelBug,
  arrowLeft: PixelArrowLeft,
  trendingDown: PixelTrendingDown,
  twitter: PixelTwitter,
  instagram: PixelInstagram,
  share: PixelShare,
  externalLink: PixelExternalLink,
  smartphone: PixelSmartphone,
  copy: PixelCopy,
  logout: PixelLogout,
  volumeOn: PixelVolumeOn,
  volumeOff: PixelVolumeOff,
};
