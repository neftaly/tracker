import R from 'ramda';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { count } from './lib';

const TickSlider = ({ tick, history, ...attrs }) => {
  const max = count(history) - 1;
  const marks = R.compose(
    R.map(R.concat('Tick ')),
    R.indexBy(R.identity),
    R.times(R.compose(
      R.multiply(Math.ceil(max / 4)),
      R.add(1)
    ))
  )(3);
  return <Slider
    {...attrs}
    max={max}
    value={tick.valueOf()}
    onChange={value => tick.set(value)}
    marks={max < 0 ? undefined : marks}
  />;
};

const SpeedSlider = ({ active, speed, ...attrs }) => {
  const isActive = active.valueOf();
  return <div {...attrs} onMouseOver={
    () => active.set(true)
  } onMouseOut={
    () => active.set(false)
  }>
    <div style={{
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: isActive && 'grey'
    }}>
      { isActive || <div children='🏁' style={{
        width: '1.5em',
        textAlign: 'center'
      }} /> }
      <Slider vertical min={0.1} max={10} value={
        speed.valueOf()
      } onChange={
        value => isActive && speed.set(value)
      } style={{
        height: 100,
        margin: '12px 5px',
        display: isActive ? 'block' : 'none'
      }} step={0.1} />
    </div>
  </div>;
};

const PlayBar = ({
  history,
  tick,
  play,
  speed,
  speedSlider
}) => <div>
  <button onClick={
    event => {
      if (tick.valueOf() === count(history) - 1) tick.set(0);
      play.update(R.not);
    }
  } children={
    play.valueOf() ? '⏸' : '▶'
  } style={{
    display: 'inline-block'
  }} />
  <TickSlider
    tick={tick}
    history={history}
    style={{
      width: 'calc(100vw - 8em)',
      margin: '0 1em',
      display: 'inline-block'
    }}
  />
  <SpeedSlider
    active={speedSlider}
    speed={speed}
    style={{
      position: 'relative',
      display: 'inline-block',
      height: '1.5em',
      width: '1.5em',
      margin: '-0.1em 0 -0.4em 0',
      backgroundColor: 'silver'
    }}
  />
</div>;

export default PlayBar;
