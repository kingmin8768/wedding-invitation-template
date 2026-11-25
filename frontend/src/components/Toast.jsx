import PropTypes from 'prop-types';

const Toast = ({ message }) => {
  return (
    <div className={`toast ${message ? 'show' : ''}`}>
      {message}
    </div>
  );
};

Toast.propTypes = {
  message: PropTypes.string.isRequired,
};

export default Toast;
