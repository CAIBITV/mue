import variables from 'config/variables';
import { memo, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Slider } from '@mui/material';
import { MdRefresh } from 'react-icons/md';

import EventBus from 'utils/eventbus';

const SliderComponent = memo((props) => {
  const shouldPersist = props.persistValue !== false;
  const isControlled = props.value !== undefined;
  const [internalValue, setInternalValue] = useState(
    localStorage.getItem(props.name) || props.default,
  );
  const resolvedValue = Number(isControlled ? props.value : internalValue);

  const handleChange = useCallback((e, text) => {
    const rawValue = e?.target?.value ?? e;
    let newValue = Number(rawValue);

    if (text) {
      if (newValue === '') {
        if (!isControlled) {
          setInternalValue(0);
        }
        return;
      }

      if (newValue > props.max) {
        newValue = props.max;
      }

      if (newValue < props.min) {
        newValue = props.min;
      }
    }

    if (!isControlled) {
      setInternalValue(newValue);
    }

    if (shouldPersist && props.name) {
      localStorage.setItem(props.name, newValue);
    }

    if (props.onChange) {
      props.onChange(newValue);
    }

    if (props.element) {
      if (!document.querySelector(props.element)) {
        document.querySelector('.reminder-info').style.display = 'flex';
        return localStorage.setItem('showReminder', true);
      }
    }

    EventBus.emit('refresh', props.category);
  }, [props, isControlled, shouldPersist]);

  const resetItem = useCallback(() => {
    handleChange({
      target: {
        value: props.default || '',
      },
    });
    toast(variables.getMessage('toasts.reset'));
  }, [handleChange, props.default]);

  return (
    <>
      <span className={'sliderTitle'}>
        {props.title}
        <span>{Number(resolvedValue)}</span>
        <span className="link" onClick={resetItem}>
          <MdRefresh />
          {variables.getMessage('modals.main.settings.buttons.reset')}
        </span>
      </span>
      <Slider
        value={Number(resolvedValue)}
        onChange={handleChange}
        valueLabelDisplay="auto"
        default={Number(props.default)}
        min={Number(props.min)}
        max={Number(props.max)}
        step={Number(props.step) || 1}
        getAriaValueText={(value) => `${value}`}
        marks={props.marks || []}
      />
    </>
  );
});

SliderComponent.displayName = 'SliderComponent';

export { SliderComponent as default, SliderComponent as Slider };
