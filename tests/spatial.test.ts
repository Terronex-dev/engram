/**
 * Spatial Search Tests
 * V2.1: Distance-based queries and geo support
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MemoryTree,
  createNode,
  haversineDistance,
  euclideanDistance,
  spatialRecall,
  findNearby
} from '../src';

describe('Spatial Distance Functions', () => {
  describe('haversineDistance', () => {
    it('should return 0 for same point', () => {
      const dist = haversineDistance(40.7128, -74.0060, 40.7128, -74.0060);
      expect(dist).toBe(0);
    });

    it('should calculate distance between NYC and LA', () => {
      // NYC: 40.7128, -74.0060
      // LA: 34.0522, -118.2437
      const dist = haversineDistance(40.7128, -74.0060, 34.0522, -118.2437);
      // Should be approximately 3935 km
      expect(dist).toBeGreaterThan(3900);
      expect(dist).toBeLessThan(4000);
    });

    it('should calculate distance between London and Paris', () => {
      // London: 51.5074, -0.1278
      // Paris: 48.8566, 2.3522
      const dist = haversineDistance(51.5074, -0.1278, 48.8566, 2.3522);
      // Should be approximately 343 km
      expect(dist).toBeGreaterThan(340);
      expect(dist).toBeLessThan(350);
    });
  });

  describe('euclideanDistance', () => {
    it('should return 0 for same point', () => {
      const dist = euclideanDistance(0, 0, 0, 0, 0, 0);
      expect(dist).toBe(0);
    });

    it('should calculate 2D distance', () => {
      const dist = euclideanDistance(0, 0, 0, 3, 4, 0);
      expect(dist).toBe(5); // 3-4-5 triangle
    });

    it('should calculate 3D distance', () => {
      const dist = euclideanDistance(0, 0, 0, 1, 2, 2);
      expect(dist).toBe(3); // sqrt(1 + 4 + 4) = 3
    });
  });
});

describe('Spatial Recall', () => {
  let tree: MemoryTree;

  beforeEach(() => {
    tree = new MemoryTree();

    // Add nodes with positions (using a 2D grid for simplicity)
    const cities = [
      { name: 'Origin', x: 0, y: 0 },
      { name: 'Near', x: 1, y: 1 },
      { name: 'Medium', x: 5, y: 5 },
      { name: 'Far', x: 10, y: 10 },
      { name: 'VeryFar', x: 100, y: 100 }
    ];

    for (const city of cities) {
      const node = createNode(city.name, { tags: ['city'] });
      node.position = { x: city.x, y: city.y };
      tree.add(node);
    }

    // Add a node without position
    const noPos = createNode('No Position', { tags: ['orphan'] });
    tree.add(noPos);
  });

  it('should find nodes within radius', () => {
    const results = spatialRecall(tree, {
      center: { x: 0, y: 0 },
      radius: 2,
      limit: 10
    });

    expect(results.length).toBe(2); // Origin and Near
    expect(results[0].node.content.data).toBe('Origin');
    expect(results[0].distance).toBe(0);
    expect(results[1].node.content.data).toBe('Near');
  });

  it('should respect radius limit', () => {
    const results = spatialRecall(tree, {
      center: { x: 0, y: 0 },
      radius: 8,
      limit: 10
    });

    expect(results.length).toBe(3); // Origin, Near, Medium
    expect(results.map(r => r.node.content.data)).toContain('Medium');
    expect(results.map(r => r.node.content.data)).not.toContain('Far');
  });

  it('should sort by distance', () => {
    const results = spatialRecall(tree, {
      center: { x: 0, y: 0 },
      radius: 1000,
      limit: 5
    });

    for (let i = 1; i < results.length; i++) {
      expect(results[i].distance).toBeGreaterThanOrEqual(results[i-1].distance);
    }
  });

  it('should respect limit', () => {
    const results = spatialRecall(tree, {
      center: { x: 0, y: 0 },
      radius: 1000,
      limit: 3
    });

    expect(results.length).toBe(3);
  });

  it('should ignore nodes without position', () => {
    const results = spatialRecall(tree, {
      center: { x: 0, y: 0 },
      radius: 1000,
      limit: 100
    });

    const names = results.map(r => r.node.content.data);
    expect(names).not.toContain('No Position');
  });
});

describe('findNearby', () => {
  let tree: MemoryTree;
  let originId: string;

  beforeEach(() => {
    tree = new MemoryTree();

    // Create origin node
    const origin = createNode('Origin', { tags: ['center'] });
    origin.position = { x: 0, y: 0 };
    originId = tree.add(origin);

    // Add nearby nodes
    const near1 = createNode('Near1', { tags: ['near'] });
    near1.position = { x: 1, y: 0 };
    tree.add(near1);

    const near2 = createNode('Near2', { tags: ['near'] });
    near2.position = { x: 0, y: 1 };
    tree.add(near2);

    const far = createNode('Far', { tags: ['far'] });
    far.position = { x: 10, y: 10 };
    tree.add(far);
  });

  it('should find nodes near a given node', () => {
    const results = findNearby(tree, originId, 2);

    expect(results.length).toBe(2); // Near1 and Near2, not Origin itself
    expect(results.map(r => r.node.content.data)).not.toContain('Origin');
    expect(results.map(r => r.node.content.data)).toContain('Near1');
    expect(results.map(r => r.node.content.data)).toContain('Near2');
  });

  it('should exclude the source node', () => {
    const results = findNearby(tree, originId, 100);

    expect(results.map(r => r.node.id)).not.toContain(originId);
  });

  it('should throw for node without position', () => {
    const noPos = createNode('No Position');
    const noPosId = tree.add(noPos);

    expect(() => findNearby(tree, noPosId, 10)).toThrow();
  });
});

describe('Geo Queries (Haversine)', () => {
  let tree: MemoryTree;

  beforeEach(() => {
    tree = new MemoryTree();

    // Real cities with lat/lon
    const cities = [
      { name: 'New York', lat: 40.7128, lon: -74.0060 },
      { name: 'Boston', lat: 42.3601, lon: -71.0589 },      // ~306 km from NYC
      { name: 'Philadelphia', lat: 39.9526, lon: -75.1652 }, // ~130 km from NYC
      { name: 'Los Angeles', lat: 34.0522, lon: -118.2437 } // ~3935 km from NYC
    ];

    for (const city of cities) {
      const node = createNode(`City: ${city.name}`, { tags: ['city'] });
      // Use x for lat, y for lon (per our convention)
      node.position = { x: city.lat, y: city.lon };
      tree.add(node);
    }
  });

  it('should find cities within 200km of NYC using haversine', () => {
    const results = spatialRecall(tree, {
      center: { x: 40.7128, y: -74.0060 }, // NYC
      radius: 200, // km
      metric: 'haversine',
      limit: 10
    });

    const names = results.map(r => r.node.content.data);
    expect(names).toContain('City: New York');
    expect(names).toContain('City: Philadelphia');
    expect(names).not.toContain('City: Boston'); // 306 km
    expect(names).not.toContain('City: Los Angeles'); // 3935 km
  });

  it('should find cities within 500km of NYC', () => {
    const results = spatialRecall(tree, {
      center: { x: 40.7128, y: -74.0060 },
      radius: 500,
      metric: 'haversine',
      limit: 10
    });

    const names = results.map(r => r.node.content.data);
    expect(names).toContain('City: Boston');
    expect(names).not.toContain('City: Los Angeles');
  });
});
