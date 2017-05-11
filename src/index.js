import React from 'react';
import ReactDOM from 'react-dom';
import { List } from 'immutable';
import { parser, states } from 'tracker-parser';
import R from 'ramda';
// import setAsap from 'setasap';
import { filePrompt, fileReader } from './lib';
import Main from './Main';
import local from './local';

class Root extends React.Component {
  constructor () {
    super();

    this.state = {
      history: new List([]),
      local: local.on(
        'next-animation-frame',
        () => this.setState({ local: local.cursor() })
      ).cursor()
    };

    window.loadFile = () => R.composeP(
      history => this.setState({ history }),
      events => states(undefined, events),
      parser,
      fileReader,
      R.prop(0),
      filePrompt
    )({
      accept: '.PRdemo'
    });
  }

  render () {
    return React.createElement(Main, this.state);
  }
}

ReactDOM.render(
  React.createElement(Root),
  document.getElementById('root')
);
