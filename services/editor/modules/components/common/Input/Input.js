import React, { PropTypes } from 'react';
import style from './Input.css';

const isEnterKeyPressed = event => event.keyCode === 13 || event.which === 13;

const Input = ({ onEnterKeyPress, onChange, ...props }) => (
  <input
    onKeyPress={(e) => {
      if (onEnterKeyPress && isEnterKeyPressed(e)) {
        onEnterKeyPress();
        e.preventDefault();
      }
    }}
    onChange={e => onChange && onChange(e.target.value)}
    {...props}
  />
  );

Input.propTypes = {
  onEnterKeyPress: PropTypes.func,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  type: PropTypes.string,
};

Input.defaultProps = {
  onEnterKeyPress: undefined,
  onChange: undefined,
  placeholder: '',
  className: style['text-input'],
  type: 'text',
};

export default Input;
