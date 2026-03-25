import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import { useTransformPolling } from '../hooks/useTransformPolling';

export interface ClaudeMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ClaudeState {
  isConnected: boolean;
  isProcessing: boolean;
  messages: ClaudeMessage[];
  error?: string;
}

export interface ClaudeContextValue extends ClaudeState {
  sendMessage: (projectId: string, content: string) => Promise<void>;
  cancelTransform: () => void;
  clearMessages: () => void;
}

type Action =
  | { type: 'ADD_MESSAGE'; payload: ClaudeMessage }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | undefined }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'CLEAR_MESSAGES' };

const initialState: ClaudeState = {
  isConnected: false,
  isProcessing: false,
  messages: [],
  error: undefined,
};

function reducer(state: ClaudeState, action: Action): ClaudeState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [], error: undefined };
    default:
      return state;
  }
}

function makeId(): string {
  return Math.random().toString(36).substring(2, 11);
}

const ClaudeContext = createContext<ClaudeContextValue | null>(null);

export function ClaudeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    isProcessingRef.current = state.isProcessing;
  }, [state.isProcessing]);

  const polling = useTransformPolling({
    onComplete: (result) => {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: makeId(),
          role: 'assistant',
          content: result?.description ?? 'Transformación completada',
          timestamp: new Date().toISOString(),
        },
      });
      dispatch({ type: 'SET_PROCESSING', payload: false });
      dispatch({ type: 'SET_ERROR', payload: undefined });
    },
    onError: (error) => {
      dispatch({ type: 'SET_ERROR', payload: error });
      dispatch({ type: 'SET_PROCESSING', payload: false });
    },
  });

  const sendMessage = useCallback(
    async (projectId: string, content: string) => {
      if (isProcessingRef.current) {
        throw new Error('Ya hay una transformación en proceso');
      }

      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: makeId(),
          role: 'user',
          content,
          timestamp: new Date().toISOString(),
        },
      });
      dispatch({ type: 'SET_PROCESSING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: undefined });

      try {
        const res = await fetch(`/api/transform/${projectId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content }),
        });

        if (!res.ok) {
          throw new Error('Error al procesar transformación');
        }

        const data = await res.json();
        dispatch({ type: 'SET_CONNECTED', payload: true });
        polling.startPolling(projectId, data.conversationId);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Error al procesar transformación';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        dispatch({ type: 'SET_PROCESSING', payload: false });
      }
    },
    [polling]
  );

  const cancelTransform = useCallback(() => {
    polling.stopPolling();
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: makeId(),
        role: 'system',
        content: 'Transformación cancelada',
        timestamp: new Date().toISOString(),
      },
    });
    dispatch({ type: 'SET_PROCESSING', payload: false });
  }, [polling]);

  const clearMessages = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  }, []);

  const value: ClaudeContextValue = {
    ...state,
    sendMessage,
    cancelTransform,
    clearMessages,
  };

  return (
    <ClaudeContext.Provider value={value}>{children}</ClaudeContext.Provider>
  );
}

export function useClaude(): ClaudeContextValue {
  const context = useContext(ClaudeContext);
  if (!context) {
    throw new Error('useClaude must be used within a ClaudeProvider');
  }
  return context;
}
