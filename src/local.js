import immstruct from 'immstruct';
import { fromJS } from 'immutable';

const route = () => {
  try {
    return JSON.parse(
      window.location.hash.substring(1)
    );
  } catch (e) {
    return {};
  }
};

const local = immstruct({
  tick: 0,
  play: true,
  speed: 1,
  speedSlider: false,
  ...route()
});

local.on(
  'next-animation-frame',
  state => window.history.replaceState(
    undefined,
    undefined,
    '#' + JSON.stringify(state)
  )
);

window.addEventListener(
  'popstate',
  event => local.cursor().merge(
    fromJS(route())
  )
);

export default local;
