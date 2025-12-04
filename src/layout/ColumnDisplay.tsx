import React from 'react';
import computeLayers from './layout/graphLayers';
import type { RawDevice } from './types/types';

interface ColumnDisplayProps {
  devices: RawDevice[];
}

const ColumnDisplay: React.FC<ColumnDisplayProps> = ({ devices }) => {
  // Compute the layers
  const layerMap = computeLayers(devices);

  // Group nodes by column
  const columnGroups = new Map<number, string[]>();
  layerMap.forEach((column, id) => {
    if (!columnGroups.has(column)) {
      columnGroups.set(column, []);
    }
    columnGroups.get(column)!.push(id);
  });

  // Sort columns by number
  const sortedColumns = Array.from(columnGroups.keys()).sort((a, b) => a - b);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Column Groups</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sortedColumns.map((columnNum) => {
          const nodes = columnGroups.get(columnNum)!;
          return (
            <div
              key={columnNum}
              style={{
                padding: '10px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            >
              <strong>Column {columnNum}:</strong>{' '}
              <span style={{ color: '#0066cc' }}>
                ({nodes.length}) [{nodes.map(id => `'${id}'`).join(', ')}]
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ColumnDisplay;


import ColumnDisplay from './ColumnDisplay';
import { diagramConfig6 } from './configs';

function App() {
  return (
    <div>
      <ColumnDisplay devices={diagramConfig6.devices} />
    </div>
  );
}