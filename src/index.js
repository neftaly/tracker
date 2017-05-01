import React from 'react';
import ReactDOM from 'react-dom';
import { fromJS } from 'immutable';
import R from 'ramda';
import Main from './Main';
import local from './local';

const history = R.reduce(
  (past, current) => {
    const last = past.last();
    return past.push(
      last.set('a', current)
    );
  },
  fromJS([
    { a: [90, 40] }
  ]),
  [
    fromJS([100, 50]),
    fromJS([110, 60]),
    fromJS([120, 50]),
    fromJS([130, 40])
  ]
);

class Root extends React.Component {
  constructor () {
    super();

    const addHistory = fn => {
      const oldHistory = this.state.history;
      const oldState = oldHistory.get(-1);
      const newState = fn(oldState);
      const newHistory = oldHistory.push(newState);
      this.setState({ history: newHistory });
      return newHistory;
    };

    this.state = {
      history,
      addHistory,
      local: local.on(
        'swap',
        () => this.setState({ local: local.cursor() })
      ).cursor()
    };
  }

  render () {
    return React.createElement(Main, this.state);
  }
}

ReactDOM.render(
  React.createElement(Root),
  document.getElementById('root')
);
