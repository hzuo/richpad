import * as _ from "lodash";
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
        text: "at1",
      },
      {
        text: "at2",
      },
    ],
  },
  hashtag: {
    triggerSpec: _.assign(mkDefaultSpec("#"), {
      matchStringAllowed: /^[^\s]*$/,
    }),
    completionItems: [],
  },
  relation: {
    triggerSpec: mkDefaultSpec("<>"),
    completionItems: [],
  },
};

ReactDOM.render(
  <Provider store={store}>
    <CompletingEditor completionSpecs={completionSpecs}/>
  </Provider>,
  document.getElementById("root"),
);
