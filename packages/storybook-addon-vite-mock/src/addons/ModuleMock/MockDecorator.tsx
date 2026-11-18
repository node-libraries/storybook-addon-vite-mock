import { Decorator } from '@storybook/react';
import React from 'react';
import { STORY_RENDER_PHASE_CHANGED } from 'storybook/internal/core-events';
import { useChannel, useEffect, useRef, useState } from 'storybook/preview-api';
import { ADDON_ID, Mocks, moduleMockParameter } from './types.js';

type InternalModuleMock = moduleMockParameter['moduleMock'] & { __storyId?: string };

export const MockDecorator: Decorator = (Story, context) => {
  const { parameters, name, id, viewMode } = context;
  const params = useRef(parameters);
  params.current = parameters;
  const ownMocksRef = useRef<Mocks | undefined>(undefined);

  const emit = useChannel({
    [STORY_RENDER_PHASE_CHANGED]: ({ newPhase, storyId }) => {
      const currentModuleMock = (params.current as Partial<moduleMockParameter>)?.moduleMock;
      if (viewMode !== 'docs' && storyId !== id && currentModuleMock?.mocks) {
        currentModuleMock.mocks.forEach((mock) => mock.mockRestore());
        currentModuleMock.mocks = undefined;
        ownMocksRef.current = undefined;
      }
      if (newPhase === 'completed' && storyId === id) {
        if (currentModuleMock?.mocks) {
          currentModuleMock.mocks.forEach((mock) => mock.mockClear());
        }
      }
    },
  });

  useEffect(() => {
    return () => {
      const mocks = ownMocksRef.current;
      if (mocks) {
        mocks.forEach((mock) => mock.mockRestore());
        const currentModuleMock = (params.current as Partial<moduleMockParameter>)?.moduleMock;
        if (currentModuleMock && currentModuleMock.mocks === mocks) {
          currentModuleMock.mocks = undefined;
        }
        ownMocksRef.current = undefined;
      }
    };
  }, []);

  const [{ args }, render] = useState<{ args?: object }>({});
  const rawModuleMock = (params.current as Partial<moduleMockParameter>)?.moduleMock as
    | InternalModuleMock
    | undefined;
  if (rawModuleMock && rawModuleMock.__storyId !== id) {
    (params.current as Partial<moduleMockParameter>).moduleMock = {
      ...rawModuleMock,
      __storyId: id,
      mocks: undefined,
    } as InternalModuleMock;
  }

  const { moduleMock } = (params.current as Partial<moduleMockParameter>) ?? {};
  if (moduleMock && !moduleMock.mocks) {
    const m = moduleMock.mock?.();
    const mocks = !m ? undefined : Array.isArray(m) ? m : [m];
    moduleMock.mocks = mocks;
    ownMocksRef.current = mocks;
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
