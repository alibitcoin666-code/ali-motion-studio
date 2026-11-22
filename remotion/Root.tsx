import React from 'react';
import {Composition} from 'remotion';
import {TEMPLATES, compositionMeta} from '../src/v3/registry';
import {DIMENSIONS, FPS} from '../src/v3/theme';

export const RemotionRoot: React.FC = () => (
  <>
    {TEMPLATES.map((t) => (
      <Composition
        key={t.id}
        id={t.id}
        component={t.component}
        defaultProps={t.defaultProps}
        fps={FPS}
        {...DIMENSIONS[t.defaultFormat]}
        durationInFrames={t.duration(t.defaultProps)}
        calculateMetadata={({props}) => {
          const m = compositionMeta(t.id, props);
          return {width: m.width, height: m.height, durationInFrames: m.durationInFrames, fps: m.fps};
        }}
      />
    ))}
  </>
);
