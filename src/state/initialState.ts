import {EditorState} from "draft-js";
import {fromJS, List, Map} from "immutable";
import {Action, combineReducers, Reducer} from "redux";

import {Completions, SearchTexts, State} from "./state";

export const INITIAL_COMPLETIONS: Completions = fromJS({
  "#": [
    {
      name: "idea",
    },
    {
      name: "ideal",
    },
    {
      name: "DeleteUber",
    },
    {
      name: "BlackLivesMatter",
    },
    {
      name: "JeSuisParis",
    },
    {
      name: "Brexit",
    },
    {
      name: "Calexit",
    },
  ],
  "<>": [
    {
      name: "food is great",
    },
    {
      name: "design is about how things work",
    },
  ],
  "@": [
    {
      name: "Jacob Cole",
      avatar: "https://avatars1.githubusercontent.com/u/1430007",
    },
    {
      name: "Albert Slawinski",
      avatar: "https://avatars3.githubusercontent.com/u/2817891",
    },
  ],
});

export const INITIAL_EDITOR_STATE: EditorState = EditorState.createEmpty();

export const INITIAL_SEARCH_TEXTS: SearchTexts = fromJS({
  "#": "",
  "<>": "",
  "@": "",
});

export const INITIAL_STATE: State = Object.freeze({
  completions: INITIAL_COMPLETIONS,
  editorState: INITIAL_EDITOR_STATE,
  searchTexts: INITIAL_SEARCH_TEXTS,
});
