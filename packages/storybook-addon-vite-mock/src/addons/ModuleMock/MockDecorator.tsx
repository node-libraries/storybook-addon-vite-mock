import { Decorator } from '@storybook/react';
import React, { useEffect, useRef, useState } from 'react';
import { STORY_RENDER_PHASE_CHANGED } from 'storybook/internal/core-events';
import { useChannel } from 'storybook/preview-api';
import { ADDON_ID, Mocks, moduleMockParameter } from './types.js';

type InternalModuleMock = moduleMockParameter['moduleMock'] & { __storyId?: string };

const MockWrapper: React.FC<{
  Story: Parameters<Decorator>[0];
  context: Parameters<Decorator>[1];
  emit: ReturnType<typeof useChannel>;
}> = ({ Story, context, emit }) => {
  const { parameters, name, id } = context;
  const params = useRef(parameters);
  params.current = parameters;
  const ownMocksRef = useRef<Mocks | undefined>(undefined);

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
    rawModuleMock.__storyId = id;
    rawModuleMock.mocks = undefined;
  }

  const { moduleMock } = (params.current as Partial<moduleMockParameter>) ?? {};
  if (moduleMock) {
    moduleMock.render = (nextArgs) => render({ args: nextArgs });
  }
  if (moduleMock && !moduleMock.mocks) {
    const m = moduleMock.mock?.();
    const mocks = !m ? undefined : Array.isArray(m) ? m : [m];
    moduleMock.mocks = mocks;
    ownMocksRef.current = mocks;
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
  return <>{Story(args ? { args } : undefined)}</>;
};

export const MockDecorator: Decorator = (Story, context) => {
  const { parameters, id, viewMode } = context;
  const params = useRef(parameters);
  params.current = parameters;

  const emit = useChannel({
    [STORY_RENDER_PHASE_CHANGED]: ({ newPhase, storyId }) => {
      const currentModuleMock = (params.current as Partial<moduleMockParameter>)?.moduleMock;
      if (viewMode !== 'docs' && storyId !== id && currentModuleMock?.mocks) {
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

  return <MockWrapper Story={Story} context={context} emit={emit} />;
};

export const parameters: moduleMockParameter = {
  moduleMock: {
    render: () => {
      //
    },
  },
};
