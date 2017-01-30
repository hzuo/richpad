import {EditorState} from "draft-js";
import {fromJS, List, Map} from "immutable";
import {Action, combineReducers, Reducer} from "redux";

import {INITIAL_COMPLETIONS, INITIAL_EDITOR_STATE} from "./initialState";

export type Completions = Map<string, List<string>>;

export interface State {
  completions: Completions;
  editorState: EditorState;
}

export type ActionType = "SET_EDITOR_STATE"; // string literal type

export interface FSA extends Action {
  type: ActionType;
  payload?: any;
  error?: true; // boolean literal type
  meta?: any;
}

export const setEditorState = (editorState: EditorState): FSA => ({
  type: "SET_EDITOR_STATE",
  payload: {editorState},
});

const completionsReducer: Reducer<Completions> = (state = INITIAL_COMPLETIONS, action: FSA) => state;

const editorStateReducer: Reducer<EditorState> = (state = INITIAL_EDITOR_STATE, action: FSA) => {
  if (action.type === "SET_EDITOR_STATE") {
    return action.payload.editorState;
  }
  return state;
};

export const rootReducer = combineReducers({
  completions: completionsReducer,
  editorState: editorStateReducer,
});
