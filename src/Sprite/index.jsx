import R from 'ramda';
import sprites from './sprites.json';
import spriteSheet from './sprites.png';

export default ({ name, style }) => {
  const [
    offset,
    width,
    height
  ] = R.map(
    n => n + 'px',
    sprites[name]
  );

  return (
    <div style={{
      overflow: 'hidden',
      position: 'absolute',
      backgroundImage: `url('${spriteSheet}')`,
      backgroundPosition: `-${offset} 0px`,
      width,
      height,
      ...style
    }} />
  );
};
