import Sprite from './Sprite';
import Map from './Map';
import R from 'ramda';
import { TickSlider, SpeedSlider } from './Sliders';
import vehicleData from './vehicles.json';
import immutable from 'immutable';

const Root = ({ local, history, loading }) => {
  const tick = local.cursor('tick');
  const play = local.cursor('play');
  const current = history.get(tick.valueOf(), history.get(-1));

  const vehicles = current && R.map(
    R.compose(
      data => <Sprite name={
        R.path([data.name, 'miniMapIcon'], vehicleData)
      } style={{
        left: 250 + data.status.x / 2,
        top: 250 - data.status.z / 2,
        transform: `rotate(${data.status.yaw}deg)`
      }} key={data.id} />,
      ([ id, rest ]) => ({ id, ...rest })
    ),
    R.toPairs(
      current.get(
        'vehicles',
        new immutable.Map({})
      ).toJS()
    )
  );

  const mapName = current && current.getIn(['server', 'details', 'mapName']);

  return (
    <div>
      Current app state:
      <pre children={JSON.stringify(local, null, 2)} />

      { current
        ? 'file loaded'
        : <button onClick={window.loadFile} children='load PRdemo' />
      }

      <hr />

      <button onClick={
        () => {
          if (tick.valueOf() === history.count() - 1) tick.set(0);
          play.update(R.not);
        }
      } children={
        play.valueOf() ? '⏸' : '▶'
      } style={{
        display: 'inline-block'
      }} />
      <TickSlider tick={tick} history={history} style={{
        width: 'calc(100vw - 8em)',
        margin: '0 1em',
        display: 'inline-block'
      }} />
      <SpeedSlider active={
        local.cursor('speedSlider')
      } speed={
        local.cursor('speed')
      } style={{
        position: 'relative',
        display: 'inline-block',
        height: '1.5em',
        width: '1.5em',
        margin: '-0.1em 0 -0.4em 0',
        backgroundColor: 'silver'
      }} />

      <hr />

      <Map name={mapName} style={{
        height: 500,
        width: 500,
        display: 'inline-block'
      }} children={vehicles} />
      <pre children={JSON.stringify(current, null, 2)} style={{
        display: 'inline-block',
        height: '500px',
        width: 'calc(100vw - 600px)',
        overflowY: 'scroll'
      }} />

    </div>
  );
};

export default Root;
