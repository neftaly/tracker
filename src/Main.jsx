import Sprite from './Sprite';
import Map from './Map';
import R from 'ramda';
import { TickSlider, SpeedSlider } from './Sliders';
import { List } from 'immutable';

const Root = ({ local, history, addHistory }) => {
  const tick = local.cursor('tick');
  const play = local.cursor('play');
  const current = history.get(tick.valueOf()) || history.get(-1);

  return (
    <div>
      Current app state:
      <pre children={JSON.stringify(local, null, 2)} />

      <hr />

      Current history state:
      <pre children={JSON.stringify(current, null, 2)} />

      <hr />

      Entire history:
      <pre children={JSON.stringify(history, null, 2)} style={{
        overflow: 'scroll',
        height: '10em'
      }} />

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

      <button onClick={
        () => addHistory(state => state.set(
          'a',
          List([
            Math.random() * 500,
            Math.random() * 500
          ])
        ))
      } children='Add some history' />

      <hr />

      <Map name='albasrah' style={{
        height: 500,
        width: 500
      }}>
        <Sprite name='arf_cp' style={{
          left: current.getIn(['a', 0]).valueOf(),
          top: current.getIn(['a', 1]).valueOf()
        }} />
      </Map>
    </div>
  );
};

export default Root;
