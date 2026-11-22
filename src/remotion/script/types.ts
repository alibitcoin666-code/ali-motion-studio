import {BaseProps} from '../theme';

/** Scene kinds shared by the Whiteboard and Stickman templates. */
export type SceneKind = 'title' | 'explain' | 'list' | 'keyboard' | 'staff' | 'hand' | 'exercise' | 'quiz' | 'outro';

export interface ScriptScene {
  kind: SceneKind;
  title: string;
  text?: string;
  /** list / outro items, quiz options (one per line) */
  items?: string[];
  /** keyboard: notes like "C4 E4 G4" */
  notes?: string;
  /** keyboard / hand: finger numbers like "1 3 5" */
  fingers?: string;
  /** staff: "E4:می F4:فا" (note:label) */
  staff?: string;
  /** hand: which hand */
  hand?: 'right' | 'left';
  /** quiz: index (0-based) of the correct option */
  answer?: number;
  /** narration spoken during this scene (drives the scene length) */
  narration: string;
  /** minimum scene length in seconds (0 = fit to narration) */
  sec?: number;
}

export interface ScriptProps extends BaseProps {
  episode: string;
  courseTitle: string;
  title: string;
  subtitle: string;
  scenes: ScriptScene[];
  /** short key point pinned on the side note */
  keyPoint?: string;
  handle: string;
  cta: string;
  /** whiteboard ink colour for titles */
  ink?: 'red' | 'blue' | 'green' | 'black';
  syncNarration?: boolean;
}

export const INK: Record<string, string> = {
  red: '#D7263D',
  blue: '#1F4FB8',
  green: '#1E8C4E',
  black: '#1E1E24',
};

export const SCENE_KIND_OPTIONS: {value: SceneKind; label: string}[] = [
  {value: 'title', label: 'عنوان جلسه'},
  {value: 'explain', label: 'توضیح'},
  {value: 'list', label: 'فهرست نکته‌ها'},
  {value: 'keyboard', label: 'کیبورد و نت‌ها'},
  {value: 'staff', label: 'حامل و نت‌نویسی'},
  {value: 'hand', label: 'دست و شماره انگشت'},
  {value: 'exercise', label: 'تمرین'},
  {value: 'quiz', label: 'کوییز ۴ گزینه‌ای'},
  {value: 'outro', label: 'جمع‌بندی و پایان'},
];
