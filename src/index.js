import 'babel-polyfill';
import React from 'react';
import ReactDOM from 'react-dom';
import { List } from 'immutable';
import { parser, statesStream } from 'tracker-parser';
import R from 'ramda';
import {
  filePrompt,
  fileReader,
  count
} from './lib';
import Main from './Main';
import hashRouter from './hashRouter';

const loadFile = (router, that) => R.composeP(
  R.tap(() => router.cursor().set('loading', false)),
  R.when(R.identity, R.composeP(
    events => statesStream(
      undefined,
      events,
      (done, history) => that.setState({ history })
    ),
    R.tap(() => router.cursor().set('play', true)),
    parser,
    fileReader
  )),
  R.prop(0),
  filePrompt,
  R.tap(() => router.cursor().set('loading', true).set('error', null)),
  props => Promise.resolve(props).catch(
    error => router.cursor().set('error', error)
  )
)({
  accept: '.PRdemo'
});

class Root extends React.Component {
  constructor () {
    super();

    const router = hashRouter(
      route => ({
        speed: 1,
        speedSlider: false,
        tick: 0,
        ...route,
        play: false,
        error: null,
        loading: false
      }),
      local => this.setState({ local })
    );

    this.state = {
      history: new List([]),
      local: router.cursor()
    };

    this.loadFile = event => loadFile(router, this);

    const ticker = last => time => {
      const tick = router.cursor('tick');
      if (
        router.cursor('play').valueOf() &&
        tick.valueOf() < count(this.state.history) - 1
      ) {
        const tickRate = this.state.history.getIn([
          -1, 'server', 'details', 'tickRate'
        ], 0.3) * 100;
        const speed = router.cursor('speed').valueOf();
        tick.update(R.compose(
          n => parseInt(Math.round(n * 100)) / 100,
          R.add(
            ((time - last) / tickRate) * speed
          )
        ));
      }
      return requestAnimationFrame(ticker(time));
    };
    requestAnimationFrame(time => ticker(time)(time));
  }

  render () {
    const { state, loadFile } = this;
    return React.createElement(Main, {
      loadFile,
      ...state
    });
  }
}

ReactDOM.render(
  React.createElement(Root),
  document.getElementById('root')
);
