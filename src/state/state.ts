import {EditorState} from "draft-js";
import {fromJS, List, Map} from "immutable";
import {Action, combineReducers, Reducer} from "redux";

import {INITIAL_COMPLETIONS, INITIAL_EDITOR_STATE, INITIAL_SEARCH_TEXTS} from "./initialState";

export type Completions = Map<string, List<string>>;

export type SearchTexts = Map<string, string>;

export interface State {
  completions: Completions;
  editorState: EditorState;
  searchTexts: SearchTexts;
}

export type ActionType = "SET_EDITOR_STATE" | "SET_SEARCH_TEXT"; // string literal type

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

export const setSearchText = (kind: string, searchText: string) => ({
  type: "SET_SEARCH_TEXT",
  payload: {kind, searchText},
});

const completionsReducer: Reducer<Completions> = (state = INITIAL_COMPLETIONS, action: FSA) => state;

const editorStateReducer: Reducer<EditorState> = (state = INITIAL_EDITOR_STATE, action: FSA) => {
  if (action.type === "SET_EDITOR_STATE") {
    return action.payload.editorState;
  }
  return state;
};

const searchTextsReducer: Reducer<SearchTexts> = (state = INITIAL_SEARCH_TEXTS, action: FSA) => {
  if (action.type === "SET_SEARCH_TEXT") {
    const {kind, searchText} = action.payload;
    return state.set(kind, searchText);
  }
  return state;
};

export const rootReducer = combineReducers({
  completions: completionsReducer,
  editorState: editorStateReducer,
  searchTexts: searchTextsReducer,
});
