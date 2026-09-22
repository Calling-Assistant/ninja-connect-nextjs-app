import { AutoDialState } from '../types';

// --- Auto Dialer Reducer ---
export interface IAutoDialerState {
    status: AutoDialState;
    numbers: string[];
    timer: number;
    dialInput: string;
    prePauseStatus?: AutoDialState;
}

export const getAutoDialerInitialState = (): IAutoDialerState => {
    try {
        const savedNumbers = localStorage.getItem('autoDialerNumbers');
        const numbers = savedNumbers ? JSON.parse(savedNumbers) : [];
        return {
            status: 'IDLE',
            numbers: numbers,
            timer: 0,
            dialInput: '',
            prePauseStatus: undefined,
        };
    } catch (error) {
        console.error("Failed to parse auto-dialer state from localStorage", error);
        return {
            status: 'IDLE',
            numbers: [],
            timer: 0,
            dialInput: '',
            prePauseStatus: undefined,
        };
    }
};

export type AutoDialerAction =
    | { type: 'SET_INPUT'; payload: string }
    | { type: 'PROCESS_DATA' }
    | { type: 'START' }
    | { type: 'PAUSE' }
    | { type: 'RESUME' }
    | { type: 'TERMINATE' }
    | { type: 'CALL_ENDED'; payload: { cooldown: number } }
    | { type: 'TIMER_TICK' }
    | { type: 'DIAL_NEXT' }
    | { type: 'DIAL_INITIATED' }
    | { type: 'DELETE_NUMBER'; payload: number }
    | { type: 'INCOMING_CALL_RECEIVED' };


export function autoDialerReducer(state: IAutoDialerState, action: AutoDialerAction): IAutoDialerState {
    switch (action.type) {
        case 'SET_INPUT':
            return { ...state, dialInput: action.payload };
        case 'PROCESS_DATA': {
            const matches = state.dialInput.match(/(\+91\s?\d{10}|\d{10}|\+91\d{10})/g) || [];
            const uniqueNumbers = [...new Set(matches)];
            return { ...getAutoDialerInitialState(), numbers: uniqueNumbers, dialInput: '' };
        }
        case 'START':
            if (state.numbers.length > 0) {
                return { ...state, status: 'DIALING', prePauseStatus: undefined };
            }
            return state;
        case 'PAUSE':
            if (state.status === 'DIALING' || state.status === 'DIALING_INITIATED' || state.status === 'COOLDOWN') {
                return { ...state, status: 'PAUSED', prePauseStatus: state.status };
            }
            return state;
        case 'INCOMING_CALL_RECEIVED':
            if (state.status === 'DIALING' || state.status === 'DIALING_INITIATED' || state.status === 'COOLDOWN') {
                return { ...state, status: 'PAUSED', prePauseStatus: state.status };
            }
            return state;
        case 'RESUME':
            if (state.status === 'PAUSED') {
                // If resuming from a cooldown, simply continue the cooldown.
                if (state.prePauseStatus === 'COOLDOWN') {
                    return { ...state, status: 'COOLDOWN', prePauseStatus: undefined };
                }

                // If resuming from dialing (or for legacy cases where prePauseStatus is not set),
                // it's assumed the call that was active has concluded. We skip it and dial the next one.
                if (state.prePauseStatus === 'DIALING' || state.prePauseStatus === 'DIALING_INITIATED' || state.prePauseStatus === undefined) {
                    const nextNumbers = state.numbers.slice(1);
                    if (nextNumbers.length > 0) {
                        return {
                            ...state,
                            status: 'DIALING',
                            numbers: nextNumbers,
                            timer: 0,
                            prePauseStatus: undefined,
                        };
                    }
                    // If it was the last number, terminate.
                    return { ...getAutoDialerInitialState(), numbers: [] };
                }
            }
            return state;
        case 'TERMINATE':
            return { ...getAutoDialerInitialState(), numbers: state.numbers };
        case 'DIAL_INITIATED':
            if (state.status === 'DIALING') {
                return { ...state, status: 'DIALING_INITIATED' };
            }
            return state;
        case 'CALL_ENDED':
            if (state.status === 'DIALING' || state.status === 'DIALING_INITIATED') {
                // Call ended, remove the number that was just called.
                const remainingNumbers = state.numbers.slice(1);
                if (remainingNumbers.length > 0) {
                     // Go to cooldown before dialing the next one.
                    return { ...state, status: 'COOLDOWN', numbers: remainingNumbers, timer: action.payload.cooldown, prePauseStatus: undefined };
                }
                // Last number was dialed, finish the process.
                return { ...getAutoDialerInitialState(), numbers: [] };
            }
            return state;
        case 'TIMER_TICK':
            return { ...state, timer: Math.max(0, state.timer - 1) };
        case 'DIAL_NEXT':
            // Cooldown finished, dial the next number (which is now at index 0).
            if (state.numbers.length > 0) {
                return { ...state, status: 'DIALING', timer: 0, prePauseStatus: undefined };
            }
            return { ...state, status: 'IDLE' }; // Finished
        case 'DELETE_NUMBER': {
            const newNumbers = state.numbers.filter((_, i) => i !== action.payload);
             // If we are dialing and the user deletes the current number (index 0), dial the next one immediately.
            if ((state.status === 'DIALING' || state.status === 'DIALING_INITIATED') && action.payload === 0) {
                if (newNumbers.length > 0) {
                    return { ...state, status: 'DIALING', numbers: newNumbers };
                }
                // List is now empty, stop the process.
                return { ...getAutoDialerInitialState(), numbers: [] };
            }
            return { ...state, numbers: newNumbers };
        }
        default:
            return state;
    }
}