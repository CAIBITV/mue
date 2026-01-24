import { useState, useEffect, useRef } from 'react';

import { convertTimezone } from 'utils/date';
import { formatPercentage, formatDigits } from 'utils/formatNumber';
import { AnalogClock } from './components/AnalogClock';
import { VerticalClock } from './components/VerticalClock';
import EventBus from 'utils/eventbus';

import './clock.scss';

const Clock = () => {
  const [timeType] = useState(localStorage.getItem('timeType'));
  const [time, setTime] = useState('');
  const [finalHour, setFinalHour] = useState('');
  const [finalMinute, setFinalMinute] = useState('');
  const [finalSeconds, setFinalSeconds] = useState('');
  const [ampm, setAmpm] = useState('');
  const [display, setDisplay] = useState('block');
  const [fontSize, setFontSize] = useState('4em');
  const timerRef = useRef(undefined);

  const startTime = (
    time = localStorage.getItem('seconds') === 'true' ||
    localStorage.getItem('timeType') === 'analogue'
      ? 1000 - (Date.now() % 1000)
      : 60000 - (Date.now() % 60000),
  ) => {
    timerRef.current = setTimeout(() => {
      let now = new Date();
      const timezone = localStorage.getItem('timezone');
      if (timezone && timezone !== 'auto') {
        now = convertTimezone(now, timezone);
      }

      switch (localStorage.getItem('timeType')) {
        case 'percentageComplete':
          setTime((now.getHours() / 24).toFixed(2).replace('0.', '') + '%');
          setAmpm('');
          break;
        case 'analogue':
          // load analog clock css
          import('react-clock/dist/Clock.css');

          setTime(now);
          break;
        default: {
          // Default clock
          let time,
            sec = '';
          const zero = localStorage.getItem('zero');

          if (localStorage.getItem('seconds') === 'true') {
            const secs = ('00' + now.getSeconds()).slice(-2);
            sec = `:${formatDigits(secs)}`;
            setFinalSeconds(formatDigits(secs));
          }

          if (localStorage.getItem('timeformat') === 'twentyfourhour') {
            if (zero === 'false') {
              const hours = now.getHours();
              const minutes = ('00' + now.getMinutes()).slice(-2);
              time = `${formatDigits(hours)}:${formatDigits(minutes)}${sec}`;
              setFinalHour(formatDigits(hours));
              setFinalMinute(formatDigits(minutes));
            } else {
              const hours = ('00' + now.getHours()).slice(-2);
              const minutes = ('00' + now.getMinutes()).slice(-2);
              time = `${formatDigits(hours)}:${formatDigits(minutes)}${sec}`;
              setFinalHour(formatDigits(hours));
              setFinalMinute(formatDigits(minutes));
            }

            setTime(time);
            setAmpm('');
          } else {
            // 12 hour
            let hours = now.getHours();

            if (hours > 12) {
              hours -= 12;
            } else if (hours === 0) {
              hours = 12;
            }

            if (zero === 'false') {
              const minutes = ('00' + now.getMinutes()).slice(-2);
              time = `${formatDigits(hours)}:${formatDigits(minutes)}${sec}`;
              setFinalHour(formatDigits(hours));
              setFinalMinute(formatDigits(minutes));
            } else {
              const paddedHours = ('00' + hours).slice(-2);
              const minutes = ('00' + now.getMinutes()).slice(-2);
              time = `${formatDigits(paddedHours)}:${formatDigits(minutes)}${sec}`;
              setFinalHour(formatDigits(paddedHours));
              setFinalMinute(formatDigits(minutes));
            }

            setTime(time);
            setAmpm(now.getHours() > 11 ? 'PM' : 'AM');
          }
          break;
        }
      }

      startTime();
    }, time);
  };

  useEffect(() => {
    const handleRefresh = (data) => {
      if (data === 'clock' || data === 'timezone') {
        if (localStorage.getItem('time') === 'false') {
          setDisplay('none');
          return;
        }

        timerRef.current = null;
        startTime(0);

        setDisplay('block');
        setFontSize(`${4 * Number((localStorage.getItem('zoomClock') || 100) / 100)}em`);
      }
    };

    if (localStorage.getItem('timeType') !== 'analogue') {
      setFontSize(`${4 * Number((localStorage.getItem('zoomClock') || 100) / 100)}em`);
    }

    startTime(0);

    EventBus.on('refresh', handleRefresh);
    return () => {
      EventBus.off('refresh');
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  if (localStorage.getItem('timeType') === 'analogue') {
    return <AnalogClock time={time} />;
  }

  if (localStorage.getItem('timeType') === 'verticalClock') {
    return (
      <VerticalClock finalHour={finalHour} finalMinute={finalMinute} finalSeconds={finalSeconds} />
    );
  }

  return (
    <span className="clock clock-container" style={{ display, fontSize }}>
      {time}
      <span className="ampm">{ampm}</span>
    </span>
  );
};

export { Clock as default, Clock };
