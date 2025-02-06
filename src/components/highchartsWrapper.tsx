import { useEffect } from 'react';
import Highcharts from 'highcharts';

const HighchartsWrapper: React.FC = () => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      Highcharts.wrap(
        Highcharts.Chart.prototype,
        'setReflow',
        function (this: Highcharts.Chart, proceed: Function) {
          proceed.apply(this, Array.prototype.slice.call(arguments, 1));
          this.reflow();
        }
      );
    }
  }, []);

  return null;
};

export default HighchartsWrapper;
