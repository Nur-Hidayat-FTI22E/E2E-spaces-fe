"use client";

import React, { useEffect, useRef } from "react";

interface Node {
  id: number;
  x: number;
  y: number;
  baseR: number;
  phase: number;
  speed: number;
  label?: string;
}

interface Edge {
  a: number;
  b: number;
  t: number;
  speed: number;
}

interface RovingPacket {
  currentNode: number;
  targetNode: number;
  progress: number; // 0 to 1
  speed: number;
  size: number;
  history: number[];
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  opacity: number;
}

const REGION_LABELS = [
  "jkt-01",
  "sgp-node",
  "edge-04",
  "us-east-1",
  "k8s-pod",
  "control-plane",
  "dns-mesh",
  "worker-07",
];

export function HeroNetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const ripplesRef = useRef<Ripple[]>([]);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const rovingPacketsRef = useRef<RovingPacket[]>([]);
  const adjacencyRef = useRef<Map<number, number[]>>(new Map());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 0;
    let height = 0;
    let animId: number;
    let lastTime = performance.now();

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = parent.offsetWidth;
      height = parent.offsetHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (width === 0 || height === 0) return;

      const centerX = width * 0.5;
      const centerY = height * 0.44;
      const excludeRadiusX = width * 0.32;
      const excludeRadiusY = height * 0.28;

      const nodeCount = Math.max(16, Math.min(32, Math.round((width * height) / 42000)));
      const nodes: Node[] = [];

      for (let i = 0; i < nodeCount; i++) {
        let x = 0;
        let y = 0;
        let attempts = 0;
        // Keep center open for headline readability, like Helipod
        do {
          x = Math.random() * width;
          y = Math.random() * height;
          attempts++;
        } while (
          attempts < 15 &&
          Math.pow((x - centerX) / excludeRadiusX, 2) +
            Math.pow((y - centerY) / excludeRadiusY, 2) < 1
        );

        nodes.push({
          id: i,
          x,
          y,
          baseR: 1.8 + Math.random() * 1.8,
          phase: Math.random() * Math.PI * 2,
          speed: 0.6 + Math.random() * 0.8,
        });
      }

      // Assign labels to a few strategic nodes
      const labelCount = Math.min(REGION_LABELS.length, Math.max(3, Math.floor(nodes.length / 4)));
      const shuffledIndices = [...nodes.keys()].sort(() => Math.random() - 0.5);
      shuffledIndices.slice(0, labelCount).forEach((nodeIdx, i) => {
        nodes[nodeIdx].label = REGION_LABELS[i];
      });

      // Build edges & adjacency map
      const maxConnectDist = Math.max(150, Math.min(320, width * 0.35));
      const edges: Edge[] = [];
      const edgeSet = new Set<string>();
      const adjacency = new Map<number, number[]>();

      nodes.forEach((n, i) => {
        adjacency.set(i, []);
      });

      nodes.forEach((node, i) => {
        // Find 2-3 nearest neighbors
        const neighbors = nodes
          .map((other, j) => ({
            j,
            dist: Math.hypot(node.x - other.x, node.y - other.y),
          }))
          .filter((item) => item.j !== i && item.dist < maxConnectDist)
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 3);

        neighbors.forEach(({ j }) => {
          const edgeKey = i < j ? `${i}-${j}` : `${j}-${i}`;
          if (!edgeSet.has(edgeKey)) {
            edgeSet.add(edgeKey);
            edges.push({
              a: i,
              b: j,
              t: Math.random(),
              speed: 0.12 + Math.random() * 0.16,
            });
            adjacency.get(i)?.push(j);
            adjacency.get(j)?.push(i);
          }
        });
      });

      // Create roving packets that travel node to node across lines
      const rovingPackets: RovingPacket[] = [];
      const rovingCount = Math.max(6, Math.min(14, Math.floor(edges.length * 0.6)));

      for (let k = 0; k < rovingCount; k++) {
        const startNode = Math.floor(Math.random() * nodes.length);
        const neighbors = adjacency.get(startNode) || [];
        if (neighbors.length > 0) {
          const targetNode = neighbors[Math.floor(Math.random() * neighbors.length)];
          rovingPackets.push({
            currentNode: startNode,
            targetNode,
            progress: Math.random(),
            speed: 0.18 + Math.random() * 0.22,
            size: 2.2 + Math.random() * 1.2,
            history: [startNode],
          });
        }
      }

      nodesRef.current = nodes;
      edgesRef.current = edges;
      adjacencyRef.current = adjacency;
      rovingPacketsRef.current = rovingPackets;
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Parent container pointer listeners for interactivity
    const parent = canvas.parentElement;
    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseRef.current = { x, y, active: true };

      if (ripplesRef.current.length < 4 && Math.random() > 0.75) {
        ripplesRef.current.push({ x, y, radius: 0, opacity: 0.35 });
      }
    };

    const handlePointerLeave = () => {
      mouseRef.current.active = false;
    };

    if (parent) {
      parent.addEventListener("pointermove", handlePointerMove);
      parent.addEventListener("pointerleave", handlePointerLeave);
    }

    let time = 0;

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      if (!prefersReducedMotion) {
        time += dt;
      }

      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const adjacency = adjacencyRef.current;
      const rovingPackets = rovingPacketsRef.current;
      const mouse = mouseRef.current;

      const cyanBase = "0, 229, 255"; // #00e5ff

      // 1. Draw static connecting lines
      edges.forEach((edge) => {
        const nA = nodes[edge.a];
        const nB = nodes[edge.b];
        if (!nA || !nB) return;

        // Subtle gradient or line highlight near mouse
        let strokeAlpha = 0.15;
        if (mouse.active) {
          const midX = (nA.x + nB.x) * 0.5;
          const midY = (nA.y + nB.y) * 0.5;
          const distToMouse = Math.hypot(midX - mouse.x, midY - mouse.y);
          if (distToMouse < 180) {
            strokeAlpha = 0.15 + (1 - distToMouse / 180) * 0.25;
          }
        }

        ctx.beginPath();
        ctx.moveTo(nA.x, nA.y);
        ctx.lineTo(nB.x, nB.y);
        ctx.strokeStyle = `rgba(${cyanBase}, ${strokeAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // 2. Edge traveling light pulse (Helipod pulse style)
        if (!prefersReducedMotion) {
          edge.t = (edge.t + dt * edge.speed) % 1;
        }
        const px = nA.x + (nB.x - nA.x) * edge.t;
        const py = nA.y + (nB.y - nA.y) * edge.t;

        ctx.beginPath();
        ctx.arc(px, py, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cyanBase}, 0.85)`;
        ctx.shadowColor = `rgba(${cyanBase}, 0.9)`;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 3. Roving Packets (Dots moving along multi-node routes!)
      rovingPackets.forEach((packet) => {
        const from = nodes[packet.currentNode];
        const to = nodes[packet.targetNode];
        if (!from || !to) return;

        if (!prefersReducedMotion) {
          packet.progress += dt * packet.speed;
        }

        // Check if reached destination node
        if (packet.progress >= 1) {
          packet.progress = 0;
          packet.currentNode = packet.targetNode;
          packet.history.push(packet.targetNode);
          if (packet.history.length > 5) packet.history.shift();

          // Pick next connected neighbor (avoiding immediate backtrack if possible)
          const neighbors = adjacency.get(packet.currentNode) || [];
          const candidates =
            neighbors.length > 1
              ? neighbors.filter((n) => !packet.history.slice(-2).includes(n))
              : neighbors;

          const chosen =
            candidates.length > 0
              ? candidates[Math.floor(Math.random() * candidates.length)]
              : neighbors[Math.floor(Math.random() * neighbors.length)];

          packet.targetNode = chosen ?? packet.currentNode;
        }

        // Current position along the edge
        const curFrom = nodes[packet.currentNode];
        const curTo = nodes[packet.targetNode];
        if (!curFrom || !curTo) return;

        const currentX = curFrom.x + (curTo.x - curFrom.x) * packet.progress;
        const currentY = curFrom.y + (curTo.y - curFrom.y) * packet.progress;

        // Draw traveling photon dot with trail
        ctx.beginPath();
        ctx.arc(currentX, currentY, packet.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cyanBase}, 0.95)`;
        ctx.shadowColor = `rgba(${cyanBase}, 1)`;
        ctx.shadowBlur = 10;
        ctx.fill();

        // Inner bright white core
        ctx.beginPath();
        ctx.arc(currentX, currentY, packet.size * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 4. Draw Nodes and Labels
      nodes.forEach((node) => {
        const pulse = prefersReducedMotion ? 0 : Math.sin(time * node.speed + node.phase);
        const r = node.baseR + 0.7 * pulse;

        // Core dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cyanBase}, 0.65)`;
        ctx.fill();

        // Pulsing faint outer ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 3.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${cyanBase}, 0.22)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Technical region label (e.g. jkt-01, us-east-1)
        if (node.label) {
          const labelPhase = (0.35 * time + node.phase) % (Math.PI * 2);
          if (labelPhase < 0.7 * Math.PI || prefersReducedMotion) {
            const alpha = prefersReducedMotion
              ? 0.5
              : Math.min(1, (0.7 * Math.PI - Math.abs(labelPhase - 0.35 * Math.PI)) / (0.35 * Math.PI));

            const lx = node.x + 8;
            const ly = node.y - 8;

            ctx.beginPath();
            ctx.arc(lx, ly, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${cyanBase}, ${0.9 * alpha})`;
            ctx.fill();

            ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
            ctx.fillStyle = `rgba(207, 250, 254, ${0.75 * alpha})`; // cyan-100
            ctx.fillText(node.label, lx + 6, ly + 3);
          }
        }
      });

      // 5. Interactive Mouse Radial Lighting
      if (mouse.active) {
        const radial = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          240
        );
        radial.addColorStop(0, `rgba(${cyanBase}, 0.14)`);
        radial.addColorStop(0.3, `rgba(${cyanBase}, 0.06)`);
        radial.addColorStop(1, `rgba(${cyanBase}, 0)`);

        ctx.fillStyle = radial;
        ctx.fillRect(0, 0, width, height);

        // Gentle cursor dot
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cyanBase}, 0.8)`;
        ctx.shadowColor = `rgba(${cyanBase}, 0.8)`;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 6. Interactive Ripples
      ripplesRef.current = ripplesRef.current.filter((rp) => rp.opacity > 0.01);
      ripplesRef.current.forEach((rp) => {
        rp.radius += 1.6;
        rp.opacity *= 0.96;

        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${cyanBase}, ${0.5 * rp.opacity})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (parent) {
        parent.removeEventListener("pointermove", handlePointerMove);
        parent.removeEventListener("pointerleave", handlePointerLeave);
      }
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Rich Atmospheric Glow matching Helipod aesthetic in Cyan */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 85% 65% at 50% 25%, rgba(0, 229, 255, 0.16) 0%, rgba(0, 229, 255, 0.06) 30%, rgba(6, 182, 212, 0.02) 55%, transparent 75%)",
        }}
      />

      {/* Network Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Subtle bottom fade to blend with next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030304] to-transparent pointer-events-none" />
    </div>
  );
}
