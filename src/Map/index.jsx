import R from 'ramda';
import immutable from 'immutable';
import mapImages from './mapImages';
import Sprite from './Sprite';
import vehicleData from './vehicles.json';

const Vehicles = ({
  vehicles = new immutable.Map({})
}) => {
  const children = vehicles.entrySeq().map(
    ([ key, data ]) => {
      const object = data.toJS() || {};
      return <Sprite name={
        R.path([
          object.name,
          'miniMapIcon'
        ], vehicleData)
      } data={data} key={key} />;
    }
  );
  return <div children={children} style={{
    position: 'absolute'
  }} />;
};

const Players = ({
  players = new immutable.Map({})
}) => {
  const children = players.entrySeq().map(
    ([ key, data ]) => {
      const object = data.toJS() || {};
      const { status } = object;
      if (!status.isAlive) return <div />;
      return <Sprite name={
        status.kit
      } data={data} key={key} />;
    }
  );
  return <div children={children} style={{
    position: 'absolute'
  }} />;
};

const Map = ({ present }) => {
  const mapName = present.getIn(['server', 'details', 'mapName']);
  const mapImage = mapImages(mapName);

  return <div>
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundImage: `url('${mapImage}')`,
      height: 500,
      width: 500,
      display: 'inline-block'
    }}>
      <Vehicles vehicles={present.get('vehicles')} />
      <Players players={present.get('players')} />
    </div>
    <pre children={
      JSON.stringify(present, null, 2)
    } style={{
      display: 'inline-block',
      height: '500px',
      width: 'calc(100vw - 600px)',
      overflowY: 'scroll'
    }} />
  </div>;
};

export default Map;
