import PlayBar from './PlayBar';
import Map from './Map';

const Root = ({ loadFile, local, history }) => {
  const tick = local.cursor('tick');
  const error = local.cursor('error').toJS();
  const present = history.get(
    Math.round(tick.valueOf()),
    history.last()
  );
  return <div>
    <button
      onClick={loadFile}
      disabled={local.get('loading').valueOf()}
      children='load PRdemo'
    />

    { error && <div style={{ backgroundColor: 'salmon' }}>
      <h2 children={error.message} />
      {error.name}
    </div> }

    { present && <Map present={present} /> }
    <PlayBar
      history={history}
      tick={tick}
      play={local.cursor('play')}
      speed={local.cursor('speed')}
      speedSlider={local.cursor('speedSlider')}
    />
  </div>;
};

export default Root;
