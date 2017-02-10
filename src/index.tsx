import * as React from "react";
import * as ReactDOM from "react-dom";
import {Provider} from "react-redux";
import {applyMiddleware, createStore} from "redux";
import * as createLogger from "redux-logger";

import {CompletingEditor, CompletionSpecs, mkDefaultSpec} from "./components/CompletingEditor";
import {INITIAL_STATE} from "./state/initialState";
import {rootReducer} from "./state/state";

import "./index.css";

declare const __DEV__: boolean; // from webpack

(window as any).__DEV__ = __DEV__;

const middleware = [];
if (__DEV__) {
  const logger = createLogger();
  middleware.push(logger);
}
const store = createStore(rootReducer, INITIAL_STATE, applyMiddleware(...middleware));

const completionSpecs: CompletionSpecs = {
  mention: {
    triggerSpec: mkDefaultSpec("@"),
    completionItems: [
      {
        text: "Albert Slawinski",
      },
      {
        text: "Jacob Cole",
      },
      {
        text: "Jacov Kolantarov",
      },
    ],
    entityType: "mention",
    entityMutability: "SEGMENTED",
    keepTrigger: true,
  },
  hashtag: {
    triggerSpec: (() => {
      const spec = mkDefaultSpec("#");
      spec.matchStringAllowed = /^[^\s]*$/;
      return spec;
    })(),
    completionItems: [
      {
        text: "idea",
      },
      {
        text: "ideal",
      },
      {
        text: "DeleteUber",
      },
      {
        text: "BlackLivesMatter",
      },
      {
        text: "JeSuisParis",
      },
      {
        text: "Brexit",
      },
      {
        text: "Calexit",
      },
    ],
    entityType: "hashtag",
    entityMutability: "MUTABLE",
    keepTrigger: true,
  },
  relation: {
    triggerSpec: mkDefaultSpec("<>"),
    completionItems: [
      {
        text: "design is about how things work",
      },
      {
        text: "food is great",
      },
      {
        text: "food/group cooking coordination app for dorms",
      },
      {
        text: "foodslists.tk -- Google doc of foods people eat",
      },
    ],
    entityType: "relation",
    entityMutability: "IMMUTABLE",
    keepTrigger: true,
  },
};

ReactDOM.render(
  <Provider store={store}>
    <CompletingEditor completionSpecs={completionSpecs}/>
  </Provider>,
  document.getElementById("root"),
);
