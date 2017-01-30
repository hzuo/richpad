import {EditorState} from "draft-js";
import {fromJS, List, Map} from "immutable";
import {Action, combineReducers, Reducer} from "redux";

import {Completions, State} from "./state";

export const INITIAL_COMPLETIONS: Completions = fromJS({
  "#": [
    // TODO
  ],
  "<>": [
    // TODO
  ],
  "@": [
    // TODO
  ],
});

export const INITIAL_EDITOR_STATE: EditorState = EditorState.createEmpty();

export const INITIAL_STATE: State = Object.freeze({
  completions: INITIAL_COMPLETIONS,
  editorState: INITIAL_EDITOR_STATE,
});
