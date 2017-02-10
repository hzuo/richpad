import * as React from "react";
import * as ReactDOM from "react-dom";

import {CompletingEditor, CompletionSpecs, mkDefaultTriggerSpec} from "./components/CompletingEditor";

import "./index.css";

declare const __DEV__: boolean; // from webpack

(window as any).__DEV__ = __DEV__;

const completionSpecs: CompletionSpecs = {
  mention: {
    triggerSpec: mkDefaultTriggerSpec("@"),
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
      const spec = mkDefaultTriggerSpec("#");
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
    triggerSpec: mkDefaultTriggerSpec("<>"),
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
  <CompletingEditor completionSpecs={completionSpecs}/>,
  document.getElementById("root"),
);
