/** @jsx hJSX */
import {hJSX} from '@cycle/dom'
import tooltipIconBtn from '../widgets/TooltipIconButton'
import checkbox from '../widgets/Checkbox'
import {transformInputs} from './helpers'

const mainIcon = `<svg width="24px" height="21px" viewBox="0 0 24 21" class='icon'
version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <!-- Generator: Sketch 3.8.3 (29802) - http://www.bohemiancoding.com/sketch -->
    <title>scale</title>
    <desc>Created with Sketch.</desc>
    <defs></defs>
    <g id="icons" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <path d="M21.251,0 L5.149,0 L7.833,6.999 L1.701,7 L3.401,11.667 L0,21 L2.465,21 L13.606,21 L23.935,21 L18.569,6.999 L21.251,0 Z M13.241,20 L10.204,11.667 L11.904,7 L8.903,7 L8.903,6.999 L8.765,6.641 L6.603,1 L19.797,1 L17.635,6.641 L17.497,6.999 L17.635,7.356 L22.481,20 L13.241,20 L13.241,20 Z" id="scale" fill="#000000"></path>
    </g>
</svg>`

export function renderScalingUi (state) {
  const activeTool = state.settings.activeTool

  const scaleModeToggled = activeTool === 'scale'

  const subTools = <span className='scalingSubTools'>
    <div className='transformsGroup'>
      {transformInputs('mm', true)}
    </div>

    <div className='optionsGroup'>
      <label className='popOverContent'>
        {checkbox({id: 'snapScaling', className: 'snapScaling', checked: state.settings.snapScaling})}
        snap scaling
      </label>
      <label className='popOverContent'>
        {checkbox({id: 'uniformScaling', className: 'uniformScaling', checked: state.settings.uniformScaling})}
        uniform scaling
      </label>
    </div>
  </span>

  return tooltipIconBtn({toggled: scaleModeToggled, size: 'large', icon: mainIcon, klass: 'toScaleMode',
    tooltip: 'scale', tooltipPos: 'bottom', content: subTools})
}

export function view (state$) {
  return state$.map(renderScalingUi)
}
