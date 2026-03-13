/** @babel */
/** @jsx etch.dom */

const etch = require('etch');
const EtchComponent = require('../etch-component');

const $ = etch.dom;

module.exports = class CrabLogo extends EtchComponent {
  render() {
    return (
      <svg
        className='about-logo crab-logo'
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 200 120'
        width='570.4'
        height='100'>

        {/* Chân trái (có đốt gập) */}
        <g fill='none' stroke='#CC4C24' strokeWidth='4' strokeLinecap='round' strokeLinejoin='round'>
          <path d='M60 70 L45 65 L30 80' />
          <path d='M65 80 L50 78 L35 95' />
          <path d='M75 88 L60 88 L50 105' />
          <path d='M85 92 L75 96 L70 115' />
        </g>

        {/* Chân phải (có đốt gập) */}
        <g fill='none' stroke='#CC4C24' strokeWidth='4' strokeLinecap='round' strokeLinejoin='round'>
          <path d='M140 70 L155 65 L170 80' />
          <path d='M135 80 L150 78 L165 95' />
          <path d='M125 88 L140 88 L150 105' />
          <path d='M115 92 L125 96 L130 115' />
        </g>

        {/* Càng trái */}
        {/* Cánh tay */}
        <path d='M55 65 Q30 50 35 30' fill='none' stroke='#CC4C24' strokeWidth='7' strokeLinecap='round' />
        {/* Ngàm trên */}
        <path d='M35 30 Q25 10 10 25' fill='none' stroke='#FF6B35' strokeWidth='6' strokeLinecap='round' />
        {/* Ngàm dưới */}
        <path d='M35 30 Q25 25 25 40' fill='none' stroke='#CC4C24' strokeWidth='4' strokeLinecap='round' />

        {/* Càng phải */}
        {/* Cánh tay */}
        <path d='M145 65 Q170 50 165 30' fill='none' stroke='#CC4C24' strokeWidth='7' strokeLinecap='round' />
        {/* Ngàm trên */}
        <path d='M165 30 Q175 10 190 25' fill='none' stroke='#FF6B35' strokeWidth='6' strokeLinecap='round' />
        {/* Ngàm dưới */}
        <path d='M165 30 Q175 25 175 40' fill='none' stroke='#CC4C24' strokeWidth='4' strokeLinecap='round' />

        {/* Mai cua (tạo hình góc cạnh thực tế hơn) */}
        <path d='M 60 65 Q 100 40 140 65 Q 150 90 100 95 Q 50 90 60 65 Z' fill='#FF6B35' stroke='#CC4C24' strokeWidth='3' strokeLinejoin='round' />

        {/* Cuống mắt */}
        <path d='M85 52 L78 30' fill='none' stroke='#FF6B35' strokeWidth='4' strokeLinecap='round' />
        <path d='M115 52 L122 30' fill='none' stroke='#FF6B35' strokeWidth='4' strokeLinecap='round' />

        {/* Mắt */}
        <circle cx='78' cy='30' r='5.5' fill='#ffffff' stroke='#CC4C24' strokeWidth='1.5' />
        <circle cx='122' cy='30' r='5.5' fill='#ffffff' stroke='#CC4C24' strokeWidth='1.5' />
        <circle cx='78' cy='30' r='2.5' fill='#222222' />
        <circle cx='122' cy='30' r='2.5' fill='#222222' />

        {/* Miệng (hoặc đường chỉ của mai cua) */}
        <path d='M85 75 Q100 85 115 75' fill='none' stroke='#CC4C24' strokeWidth='2' strokeLinecap='round' />

      </svg>
    )
  }
};