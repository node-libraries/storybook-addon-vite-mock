import { Decorator } from '@storybook/react';
import React from 'react';
import { STORY_RENDER_PHASE_CHANGED } from 'storybook/internal/core-events';
import { useChannel, useRef, useState } from 'storybook/preview-api';
import { ADDON_ID, moduleMockParameter } from './types.js';

export const MockDecorator: Decorator = (Story, context) => {
  const { parameters, name, id } = context;
  const params = useRef(parameters);
  params.current = parameters;

  const emit = useChannel({
    [STORY_RENDER_PHASE_CHANGED]: ({ newPhase, storyId }) => {
      const currentModuleMock = (params.current as Partial<moduleMockParameter>)?.moduleMock;
      if (storyId !== id && currentModuleMock?.mocks) {
        currentModuleMock.mocks.forEach((mock) => mock.mockRestore());
        currentModuleMock.mocks = undefined;
      }
      if (newPhase === 'completed' && storyId === id) {
        if (currentModuleMock?.mocks) {
          currentModuleMock.mocks.forEach((mock) => mock.mockClear());
        }
      }
    },
  });
  const [{ args }, render] = useState<{ args?: object }>({});
  const { moduleMock } = (params.current as Partial<moduleMockParameter>) ?? {};
  if (moduleMock && !moduleMock.mocks) {
    const m = moduleMock.mock?.();
    const mocks = !m ? undefined : Array.isArray(m) ? m : [m];
    moduleMock.mocks = mocks;
    moduleMock.render = (args) => render({ args });
    if (mocks) {
      const sendStat = () => {
        emit(
          ADDON_ID,
          mocks.map((mock) => {
            return [mock.__name, mock.mock];
          })
        );
      };
      mocks.forEach((mock) => (mock.__event = () => sendStat()));
      sendStat();
    } else {
      emit(ADDON_ID, []);
    }
  }
  if (name === '$$mock$$') return <></>;
  return Story(args ? { args } : undefined);
};

export const parameters: moduleMockParameter = {
  moduleMock: {
    render: () => {
      //
    },
  },
};
