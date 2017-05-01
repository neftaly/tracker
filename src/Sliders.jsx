import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

const TickSlider = ({ tick, history, ...attrs }) => {
  return (
    <Slider
      {...attrs}
      max={history.count() - 1}
      value={tick.valueOf()}
      onChange={value => tick.set(value)}
    />
  );
};

const SpeedSlider = ({ active, speed, ...attrs }) => {
  const isActive = active.valueOf();
  return (
    <div {...attrs} onMouseOver={
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
        <Slider vertical min={0} max={100} value={
          speed.valueOf()
        } onChange={
          value => isActive && speed.set(value)
        } style={{
          height: 100,
          margin: '12px 5px',
          display: isActive ? 'block' : 'none'
        }} />
      </div>
    </div>
  );
};

export {
  TickSlider,
  SpeedSlider
};
