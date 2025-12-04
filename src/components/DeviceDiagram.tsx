import React from 'react';
import computeLayers from '../layout/graphLayers';
import type { RawDevice } from './types/types';

interface DeviceDiagramProps {
  devices: RawDevice[];
}

const DeviceDiagram: React.FC<DeviceDiagramProps> = ({ devices }) => {
  // Compute the column layout
  const layerMap = computeLayers(devices);
  
  // Group devices by column
  const columnGroups = new Map<number, RawDevice[]>();
  for (const device of devices) {
    const column = layerMap.get(device.id) ?? 0;
    if (!columnGroups.has(column)) {
      columnGroups.set(column, []);
    }
    columnGroups.get(column)!.push(device);
  }
  
  // Sort columns
  const sortedColumns = Array.from(columnGroups.keys()).sort((a, b) => a - b);
  
  return (
    <div style={{ display: 'flex', gap: '40px', padding: '20px' }}>
      {sortedColumns.map((columnIndex) => (
        <div 
          key={columnIndex}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            minWidth: '200px'
          }}
        >
          <h3>Column {columnIndex}</h3>
          {columnGroups.get(columnIndex)!.map((device) => (
            <div
              key={device.id}
              style={{
                border: '2px solid #333',
                borderRadius: '8px',
                padding: '15px',
                backgroundColor: device.status === 'up' ? '#d4edda' : '#f8d7da',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>
                {device.id}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>Status: </span>
                <span style={{ 
                  color: device.status === 'up' ? '#155724' : '#721c24',
                  textTransform: 'uppercase',
                  fontWeight: 'bold'
                }}>
                  {device.status}
                </span>
              </div>
              {device.links && device.links.length > 0 && (
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Links:</div>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {device.links.map((link, idx) => (
                      <li key={idx} style={{ fontSize: '14px' }}>{link}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default DeviceDiagram;