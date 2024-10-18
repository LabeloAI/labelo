import React, { useEffect, useRef } from 'react';
import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';
import 'gridstack/dist/gridstack-extra.min.css';

export const overviewDefault = [
  { id: 'overallProgress', x: 0 },
  { id: 'annotateProgress', x: 1 },
  { id: 'reviewProgress', x: 2 },
];

export const performanceDefault = [
  { id: 'taskPerformance', minH: 2, x: 0, y: 0, h: 2, w: 2 },
  { id: 'annotatePerformance', minH: 2, x: 0, y: 2, h: 2, w: 2 },
  { id: 'reviewPerformance', minH: 2, x: 2, y: 2, h: 2, w: 2 },
  { id: 'totalTime', x: 2, y: 0 },
  { id: 'avgTasktime', x: 3, y: 0 },
  { id: 'avgLabeltime', x: 2, y: 1 },
  { id: 'avgReviewtime', x: 3, y: 1 },
  { id: 'labelDistribution', x: 0, y: 4, w: 4 },
];

const GridStackLayout = ({
  items = [],
  componentsMap = {},
  onLayoutChange,
  column = 4,
  cellHeight = 180,
  isEdit = false,
}) => {
  const gridRef = useRef(null);

  useEffect(() => {
    const grid = GridStack.init(
      {
        float: false,
        column: column,
        cellHeight: cellHeight,
        staticGrid: !isEdit,
        columnOpts: {
          breakpoints: [
            { w: 900, c: 1 },
            { w: 1200, c: 2 },
            { w: Infinity, c: column },
          ],
        },
      },
      gridRef.current
    );

    const saveLayout = () => {
      const layout = grid.save();
      onLayoutChange(layout);
    };

    grid.on('change', saveLayout);

    return () => {
      grid.off('change', saveLayout);
      grid.destroy(false);
    };
  }, [onLayoutChange, isEdit, items]);

  return (
    <div className="grid-stack" ref={gridRef} style={{ width: '100%' }}>
      {items.map((item, index) => (
        <div
          className="grid-stack-item"
          gs-id={item.id}
          gs-x={item.x || 0}
          gs-y={item.y || 0}
          gs-w={item.w || 0}
          gs-h={item.h || 0}
          gs-min-w={item.minW || null}
          gs-max-w={item.maxW || null}
          gs-min-h={item.minH || null}
          gs-max-h={item.maxH || null}
          key={`${item.id}-${index}`}
        >
          <div
            className="grid-stack-item-content"
            style={{
              boxShadow:
                'rgba(0, 0, 0, 0.05) 0px 6px 24px 0px, rgba(0, 0, 0, 0.08) 0px 0px 0px 1px',
              background: 'white',
              borderRadius: '7px',
            }}
          >
            {componentsMap[item.id]}
          </div>
        </div>
      ))}
    </div>
  );
};

export default React.memo(GridStackLayout);
