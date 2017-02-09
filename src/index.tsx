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
        text: "Jacob Cole",
      },
      {
        text: "Albert Slawinski",
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
    completionItems: [],
    entityType: "hashtag",
    entityMutability: "MUTABLE",
    keepTrigger: true,
  },
  relation: {
    triggerSpec: mkDefaultSpec("<>"),
    completionItems: [],
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
