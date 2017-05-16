import R from 'ramda';
import sprites from './sprites.json';
import spriteSheet from './sprites.png';

export default ({ name, data, ...attrs }) => {
  const sprite = sprites[name] ||
    sprites['kit_light_assault']; // Temporary
  if (!sprite) return <div />;

  const [
    offset,
    width,
    height
  ] = R.map(
    n => n + 'px',
    sprite
  );

  const status = data.get('status').toJS();
  const hue = [60, 0, -120][status.team];

  return <div
    {...attrs}
    style={{
      ...attrs.style,
      overflow: 'hidden',
      position: 'absolute',
      backgroundImage: `url('${spriteSheet}')`,
      backgroundPosition: `-${offset} 0px`,
      width,
      height,
      top: 250 - status.x / 2,
      left: 250 + status.z / 2,
      filter: `hue-rotate(${hue}deg) ` +
        `drop-shadow(0 0 ${status.z / 20}px #000)`,
      transform: `rotate(${status.yaw}deg)`,
      transition: 'all 0.04s linear'
    }}
  />;
};
