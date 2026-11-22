import React from 'react';
import {Composition} from 'remotion';
import {TEMPLATES, compositionMeta} from '../src/remotion/registry';
import {DIMENSIONS, FPS} from '../src/remotion/theme';

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
        calculateMetadata={({props}) => compositionMeta(t.id, props)}
      />
    ))}
  </>
);
