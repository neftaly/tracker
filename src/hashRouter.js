import immstruct from 'immstruct';
import { fromJS } from 'immutable';
import R from 'ramda';

let hasBeenCalled = false;

const getRoute = R.compose(
  JSON.parse,
  json => json || '{}',
  R.drop(1),
  R.path(['location', 'hash'])
);

const setRoute = R.compose(
  s => window.history.replaceState(undefined, undefined, s),
  R.concat('#'),
  JSON.stringify
);

const hashRouter = (
  initializer = R.identity,
  updater = R.identity
) => {
  if (hasBeenCalled) {
    throw new Error('Only one instance of hashRouter is allowed');
  } else {
    hasBeenCalled = true;
  }

  const struct = R.compose(
    immstruct,
    initializer,
    getRoute
  )(window);

  setRoute(struct.cursor());

  struct.on(
    'swap',
    () => updater(struct.cursor())
  );

  struct.on(
    'next-animation-frame',
    setRoute
  );

  window.addEventListener(
    'popstate',
    R.compose(
      s => struct.cursor().merge(s),
      fromJS,
      getRoute,
      R.prop('target')
    )
  );

  return struct;
};

export default hashRouter;
