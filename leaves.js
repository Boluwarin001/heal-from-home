/**
 * =========================================================================
 * HEAL FROM HOME - Living Botanical Vine & Leaf System
 * Standalone interactive background engine for the #home hero section
 * =========================================================================
 */
(function () {
  "use strict";

  // Configuration tuned specifically for the Heal From Home color palette
  const CONFIG = {
    // --- Stem Styling ---
    stemColor: "rgba(255, 252, 232, 0.72)",       // Warm cream (#FFFCE8)
    stemGlowColor: "rgba(199, 255, 54, 0.18)",    // Delicate lime glow (#C7FF36)
    stemWidthBase: 2.2,                           // Base thickness at root (px)
    stemWidthTip: 0.65,                           // Tapered thickness at tip (px)

    // --- Leaf Styling ---
    leafColor: "rgba(255, 252, 235, 0.65)",       // Translucent warm cream
    leafColorHover: "rgba(255, 255, 255, 0.95)",  // Subtle luminous brighten near cursor
    leafVeinColor: "rgba(199, 255, 54, 0.42)",    // Soft herbal lime midrib
    leafSizeMin: 7,                               // Smallest leaf length near tips (px)
    leafSizeMax: 18,                              // Largest leaf length near base (px)
    leafSizeMultiplier: 1.0,                      // Global scale
    leafSpacing: 2,                               // Node interval between leaves

    // --- Breeze Movement ---
    breezeSpeed: 0.0016,                          // Speed of ambient breeze
    swayAmplitude: 22,                            // Sway displacement at tips (px)
    leafFlutterSpeed: 0.003,                      // Gentle leaf fluttering speed

    // --- Mouse Interaction ---
    mouseRadius: 160,                             // Cursor interaction repulsion radius (px)
    mouseRepelForce: 28,                          // Peak repulsion displacement force
    springStiffness: 0.045,                       // Spring-back speed
    damping: 0.88,                                // Organic movement damping

    // --- Ambient Motes / Spores ---
    enableMotes: true,                            // Delicate drifting botanical pollen
    moteCount: 24,                                // Quantity of motes
    moteColor: "rgba(255, 244, 61, 0.22)"         // Soft sun-yellow tint (#FFF43D)
  };

  const canvas = document.getElementById("hero-vine-canvas");
  if (!canvas) return;

  const section = document.getElementById("home") || canvas.parentElement;
  const ctx = canvas.getContext("2d");

  let width = 0;
  let height = 0;
  let dpr = 1;
  let isSectionVisible = true;

  // Mouse state tracker (mapped relative to hero section coordinates)
  const mouse = {
    x: -9999,
    y: -9999,
    prevX: -9999,
    prevY: -9999,
    vx: 0,
    vy: 0,
    active: false,
    lastActiveTime: 0
  };

  let vines = [];
  let motes = [];

  /**
   * Builds an individual continuous organic vine chain
   */
  function createVine(def, globalSeed) {
    const {
      startX, startY,
      baseAngle,
      totalLength,
      segments = 24,
      curlDirection = 1,
      curvature = 0.042,
      hasBranch = false
    } = def;

    const nodes = [];
    const segLength = totalLength / segments;
    let currentAngle = baseAngle;
    let currX = startX;
    let currY = startY;

    // Resting chain nodes
    for (let i = 0; i < segments; i++) {
      nodes.push({
        restX: currX,
        restY: currY,
        x: currX,
        y: currY,
        vx: 0,
        vy: 0,
        restAngle: currentAngle,
        lengthToNext: segLength
      });

      const progress = i / segments;
      const curve = Math.sin(progress * Math.PI) * curvature * curlDirection;
      const wave = Math.sin(globalSeed + i * 0.38) * 0.024;
      currentAngle += curve + wave;
      currX += Math.cos(currentAngle) * segLength;
      currY += Math.sin(currentAngle) * segLength;
    }

    // Attach alternating leaves
    const leaves = [];
    for (let i = 2; i < segments - 2; i += CONFIG.leafSpacing) {
      const progress = i / segments;
      const bell = Math.sin(progress * Math.PI * 0.85);
      const leafLen = CONFIG.leafSizeMin + (CONFIG.leafSizeMax - CONFIG.leafSizeMin) * bell;
      const side = (leaves.length % 2 === 0) ? 1 : -1;

      leaves.push({
        nodeIndex: i,
        side: side,
        baseLength: leafLen,
        baseWidth: leafLen * 0.44,
        angleOffset: (Math.PI / 3.8) * side,
        swayPhase: globalSeed + i * 0.6,
        petioleLen: 2.5
      });
    }

    // Secondary tendril branch offshoot
    let branch = null;
    if (hasBranch && segments > 14) {
      const branchRootIdx = Math.floor(segments * 0.4);
      const rootNode = nodes[branchRootIdx];
      const branchSegments = 12;
      const branchLen = totalLength * 0.42;
      const branchSegLen = branchLen / branchSegments;
      const branchNodes = [];

      let bAngle = rootNode.restAngle + (curlDirection * -0.65);
      let bx = rootNode.restX;
      let by = rootNode.restY;

      for (let j = 0; j < branchSegments; j++) {
        branchNodes.push({
          relX: bx - rootNode.restX,
          relY: by - rootNode.restY,
          x: bx,
          y: by,
          vx: 0,
          vy: 0,
          restAngle: bAngle,
          lengthToNext: branchSegLen
        });
        bAngle += (Math.sin(j * 0.4 + globalSeed) * 0.04) + (curlDirection * -0.035);
        bx += Math.cos(bAngle) * branchSegLen;
        by += Math.sin(bAngle) * branchSegLen;
      }

      const branchLeaves = [];
      for (let j = 2; j < branchSegments - 1; j += 2) {
        const bProgress = j / branchSegments;
        const bLeafLen = (CONFIG.leafSizeMin * 0.9) + (CONFIG.leafSizeMax * 0.55 - CONFIG.leafSizeMin) * (1 - bProgress * 0.5);
        const bSide = (branchLeaves.length % 2 === 0) ? 1 : -1;
        branchLeaves.push({
          nodeIndex: j,
          side: bSide,
          baseLength: bLeafLen,
          baseWidth: bLeafLen * 0.44,
          angleOffset: (Math.PI / 3.6) * bSide,
          swayPhase: globalSeed * 1.5 + j * 0.7,
          petioleLen: 2.0
        });
      }

      branch = {
        parentIndex: branchRootIdx,
        nodes: branchNodes,
        leaves: branchLeaves
      };
    }

    return {
      nodes,
      leaves,
      branch,
      seed: globalSeed,
      curlDirection
    };
  }

  /**
   * Initializes peripheral vines around the #home section edges
   * Leaves the central hero text clear for readability
   */
  function initializeVines() {
    vines = [];
    const isMobile = width < 640;
    const minDim = Math.min(width, height);

    const longReach = minDim * (isMobile ? 0.48 : 0.44);
    const medReach = minDim * (isMobile ? 0.38 : 0.34);
    const shortReach = minDim * (isMobile ? 0.28 : 0.26);

    const vineSpecs = [
      // Top-Left Corner
      {
        startX: -15,
        startY: height * 0.08,
        baseAngle: 0.65,
        totalLength: longReach * 1.05,
        segments: 26,
        curlDirection: 1,
        curvature: 0.042,
        hasBranch: true
      },
      {
        startX: width * 0.16,
        startY: -15,
        baseAngle: 1.15,
        totalLength: medReach,
        segments: 22,
        curlDirection: -1,
        curvature: 0.038,
        hasBranch: !isMobile
      },
      {
        startX: -10,
        startY: height * 0.32,
        baseAngle: 0.35,
        totalLength: shortReach * 1.1,
        segments: 20,
        curlDirection: 1,
        curvature: 0.048,
        hasBranch: false
      },

      // Top-Right Corner
      {
        startX: width + 15,
        startY: height * 0.07,
        baseAngle: 2.50,
        totalLength: longReach * 1.02,
        segments: 26,
        curlDirection: -1,
        curvature: 0.042,
        hasBranch: true
      },
      {
        startX: width * 0.84,
        startY: -15,
        baseAngle: 1.95,
        totalLength: medReach,
        segments: 22,
        curlDirection: 1,
        curvature: 0.04,
        hasBranch: !isMobile
      },
      {
        startX: width + 12,
        startY: height * 0.30,
        baseAngle: 2.80,
        totalLength: shortReach * 1.15,
        segments: 20,
        curlDirection: -1,
        curvature: 0.046,
        hasBranch: false
      },

      // Bottom-Left Corner
      {
        startX: -15,
        startY: height * 0.90,
        baseAngle: -0.65,
        totalLength: longReach * 1.06,
        segments: 26,
        curlDirection: -1,
        curvature: 0.042,
        hasBranch: true
      },
      {
        startX: width * 0.18,
        startY: height + 15,
        baseAngle: -1.25,
        totalLength: medReach,
        segments: 22,
        curlDirection: 1,
        curvature: 0.036,
        hasBranch: !isMobile
      },

      // Bottom-Right Corner
      {
        startX: width + 15,
        startY: height * 0.92,
        baseAngle: -2.48,
        totalLength: longReach * 1.04,
        segments: 26,
        curlDirection: 1,
        curvature: 0.042,
        hasBranch: true
      },
      {
        startX: width * 0.82,
        startY: height + 15,
        baseAngle: -1.90,
        totalLength: medReach,
        segments: 22,
        curlDirection: -1,
        curvature: 0.038,
        hasBranch: !isMobile
      },

      // Side Vine (Desktop only)
      ...((isMobile) ? [] : [
        {
          startX: -15,
          startY: height * 0.55,
          baseAngle: 0.15,
          totalLength: medReach * 0.92,
          segments: 22,
          curlDirection: 1,
          curvature: 0.038,
          hasBranch: false
        },
        {
          startX: width + 15,
          startY: height * 0.52,
          baseAngle: 3.00,
          totalLength: medReach * 0.92,
          segments: 22,
          curlDirection: -1,
          curvature: 0.038,
          hasBranch: false
        }
      ])
    ];

    for (let i = 0; i < vineSpecs.length; i++) {
      vines.push(createVine(vineSpecs[i], 37.19 + i * 19.41));
    }

    // Ambient floating spores
    motes = [];
    if (CONFIG.enableMotes) {
      const count = isMobile ? Math.floor(CONFIG.moteCount * 0.5) : CONFIG.moteCount;
      for (let m = 0; m < count; m++) {
        motes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: 0.7 + Math.random() * 1.5,
          alpha: 0.1 + Math.random() * 0.22,
          speedY: -0.15 - Math.random() * 0.25,
          swayFreq: 0.001 + Math.random() * 0.002,
          phase: Math.random() * Math.PI * 2
        });
      }
    }
  }

  /**
   * Physics update cycle
   */
  function updatePhysics(time) {
    if (mouse.active) {
      mouse.vx = mouse.x - mouse.prevX;
      mouse.vy = mouse.y - mouse.prevY;
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
    } else {
      mouse.vx *= 0.8;
      mouse.vy *= 0.8;
    }

    if (Date.now() - mouse.lastActiveTime > 1500) {
      mouse.active = false;
    }

    for (let v = 0; v < vines.length; v++) {
      const vine = vines[v];
      const nodes = vine.nodes;
      const N = nodes.length;

      // Update stem nodes
      for (let i = 1; i < N; i++) {
        const node = nodes[i];
        const u = i / (N - 1);

        // Breeze sway
        const swayT = time * CONFIG.breezeSpeed;
        const wave = Math.sin(swayT + vine.seed + i * 0.22) + Math.cos(swayT * 1.7 + vine.seed * 2 + i * 0.35) * 0.35;
        const amp = Math.pow(u, 1.45) * CONFIG.swayAmplitude;

        const normalX = -Math.sin(node.restAngle);
        const normalY = Math.cos(node.restAngle);
        const targetX = node.restX + normalX * (wave * amp);
        const targetY = node.restY + normalY * (wave * amp);

        // Cursor repulsion
        let pushX = 0;
        let pushY = 0;
        if (mouse.active) {
          const dx = node.x - mouse.x;
          const dy = node.y - mouse.y;
          const dist = Math.hypot(dx, dy);

          if (dist < CONFIG.mouseRadius && dist > 0.001) {
            const factor = Math.pow(1 - dist / CONFIG.mouseRadius, 2);
            const repel = factor * CONFIG.mouseRepelForce;
            pushX = (dx / dist) * repel + mouse.vx * factor * 0.18;
            pushY = (dy / dist) * repel + mouse.vy * factor * 0.18;
          }
        }

        // Spring-damper integration
        const ax = (targetX - node.x) * CONFIG.springStiffness + pushX * 0.09;
        const ay = (targetY - node.y) * CONFIG.springStiffness + pushY * 0.09;

        node.vx = (node.vx + ax) * CONFIG.damping;
        node.vy = (node.vy + ay) * CONFIG.damping;
        node.x += node.vx;
        node.y += node.vy;
      }

      // Stem continuity relaxation
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 1; i < N; i++) {
          const pA = nodes[i - 1];
          const pB = nodes[i];
          const dx = pB.x - pA.x;
          const dy = pB.y - pA.y;
          const currentDist = Math.hypot(dx, dy);
          const targetDist = pA.lengthToNext;

          if (currentDist > 0.0001) {
            const diff = (currentDist - targetDist) / currentDist;
            pB.x -= dx * diff * 0.45;
            pB.y -= dy * diff * 0.45;
          }
        }
      }

      // Branch update
      if (vine.branch) {
        const b = vine.branch;
        const parent = nodes[b.parentIndex];
        const bNodes = b.nodes;
        bNodes[0].x = parent.x;
        bNodes[0].y = parent.y;

        for (let j = 1; j < bNodes.length; j++) {
          const bNode = bNodes[j];
          const bu = j / (bNodes.length - 1);
          const bSway = Math.sin(time * CONFIG.breezeSpeed * 1.2 + vine.seed * 3 + j * 0.28) * (bu * CONFIG.swayAmplitude * 0.65);
          const bNormalX = -Math.sin(bNode.restAngle);
          const bNormalY = Math.cos(bNode.restAngle);

          const bTargetX = parent.x + bNode.relX + bNormalX * bSway;
          const bTargetY = parent.y + bNode.relY + bNormalY * bSway;

          let bPushX = 0;
          let bPushY = 0;
          if (mouse.active) {
            const bdx = bNode.x - mouse.x;
            const bdy = bNode.y - mouse.y;
            const bDist = Math.hypot(bdx, bdy);
            if (bDist < CONFIG.mouseRadius && bDist > 0.001) {
              const bFactor = Math.pow(1 - bDist / CONFIG.mouseRadius, 2);
              bPushX = (bdx / bDist) * (bFactor * CONFIG.mouseRepelForce * 0.85);
              bPushY = (bdy / bDist) * (bFactor * CONFIG.mouseRepelForce * 0.85);
            }
          }

          const bax = (bTargetX - bNode.x) * CONFIG.springStiffness + bPushX * 0.09;
          const bay = (bTargetY - bNode.y) * CONFIG.springStiffness + bPushY * 0.09;
          bNode.vx = (bNode.vx + bax) * CONFIG.damping;
          bNode.vy = (bNode.vy + bay) * CONFIG.damping;
          bNode.x += bNode.vx;
          bNode.y += bNode.vy;

          const prevB = bNodes[j - 1];
          const cdx = bNode.x - prevB.x;
          const cdy = bNode.y - prevB.y;
          const cDist = Math.hypot(cdx, cdy);
          if (cDist > 0.0001) {
            const bDiff = (cDist - prevB.lengthToNext) / cDist;
            bNode.x -= cdx * bDiff * 0.5;
            bNode.y -= cdy * bDiff * 0.5;
          }
        }
      }
    }

    // Motes
    for (let m = 0; m < motes.length; m++) {
      const mote = motes[m];
      mote.y += mote.speedY;
      mote.x += Math.sin(time * mote.swayFreq + mote.phase) * 0.25;
      if (mote.y < -10) {
        mote.y = height + 10;
        mote.x = Math.random() * width;
      }
    }
  }

  /**
   * Anatomical botanical leaf renderer with cubic Béziers & vein midrib
   */
  function drawBotanicalLeaf(x, y, angle, length, width, proximityRatio) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const alpha = 0.62 + (proximityRatio * 0.32);

    // Leaf blade
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(length * 0.32, -width * 0.85, length * 0.75, -width * 0.65, length, 0);
    ctx.bezierCurveTo(length * 0.75, width * 0.65, length * 0.32, width * 0.85, 0, 0);
    ctx.closePath();

    ctx.fillStyle = `rgba(255, 252, 235, ${alpha})`;
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Central vein
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(length * 0.5, -width * 0.05, length * 0.9, 0);
    ctx.strokeStyle = CONFIG.leafVeinColor;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Secondary veins for larger leaves
    if (length > 12) {
      ctx.beginPath();
      ctx.moveTo(length * 0.3, 0);
      ctx.lineTo(length * 0.5, -width * 0.35);
      ctx.moveTo(length * 0.3, 0);
      ctx.lineTo(length * 0.5, width * 0.35);
      ctx.moveTo(length * 0.55, 0);
      ctx.lineTo(length * 0.72, -width * 0.28);
      ctx.moveTo(length * 0.55, 0);
      ctx.lineTo(length * 0.72, width * 0.28);
      ctx.strokeStyle = "rgba(199, 255, 54, 0.25)";
      ctx.lineWidth = 0.4;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Draws a tapered vine stem using smooth quadratic midpoint interpolation
   */
  function drawVineStem(nodes, isBranch = false) {
    const N = nodes.length;
    if (N < 2) return;

    const baseWidth = isBranch ? CONFIG.stemWidthBase * 0.7 : CONFIG.stemWidthBase;
    const tipWidth = isBranch ? CONFIG.stemWidthTip * 0.7 : CONFIG.stemWidthTip;

    for (let i = 0; i < N - 1; i++) {
      const p0 = (i === 0) ? nodes[0] : {
        x: (nodes[i - 1].x + nodes[i].x) / 2,
        y: (nodes[i - 1].y + nodes[i].y) / 2
      };
      const p1 = nodes[i];
      const p2 = {
        x: (nodes[i].x + nodes[i + 1].x) / 2,
        y: (nodes[i].y + nodes[i + 1].y) / 2
      };

      const u = i / (N - 1);
      const currentWidth = baseWidth - (baseWidth - tipWidth) * Math.pow(u, 0.75);

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
      ctx.strokeStyle = CONFIG.stemColor;
      ctx.lineWidth = currentWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }

    // Tip curl flourish
    const tipNode = nodes[N - 1];
    const prevTipNode = nodes[N - 2];
    const tipAngle = Math.atan2(tipNode.y - prevTipNode.y, tipNode.x - prevTipNode.x);

    ctx.save();
    ctx.translate(tipNode.x, tipNode.y);
    ctx.rotate(tipAngle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(4, -3, 8, -5, 10, -2);
    ctx.bezierCurveTo(11.5, 0, 10.5, 2.5, 9, 2);
    ctx.strokeStyle = CONFIG.stemColor;
    ctx.lineWidth = tipWidth * 0.75;
    ctx.stroke();
    ctx.restore();
  }

  function render(time) {
    ctx.clearRect(0, 0, width, height);

    ctx.shadowBlur = 4;
    ctx.shadowColor = CONFIG.stemGlowColor;

    // Drifting motes
    if (CONFIG.enableMotes) {
      for (let m = 0; m < motes.length; m++) {
        const mote = motes[m];
        ctx.beginPath();
        ctx.arc(mote.x, mote.y, mote.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 244, 61, ${mote.alpha})`;
        ctx.fill();
      }
    }

    // Vines & Leaves
    for (let v = 0; v < vines.length; v++) {
      const vine = vines[v];
      const nodes = vine.nodes;

      drawVineStem(nodes, false);
      if (vine.branch) drawVineStem(vine.branch.nodes, true);

      // Main leaves
      for (let l = 0; l < vine.leaves.length; l++) {
        const leaf = vine.leaves[l];
        const node = nodes[leaf.nodeIndex];
        const nextNode = nodes[Math.min(leaf.nodeIndex + 1, nodes.length - 1)];
        const prevNode = nodes[Math.max(leaf.nodeIndex - 1, 0)];

        const stemTangent = Math.atan2(nextNode.y - prevNode.y, nextNode.x - prevNode.x);
        const flutter = Math.sin(time * CONFIG.leafFlutterSpeed + leaf.swayPhase) * 0.08;
        const finalAngle = stemTangent + leaf.angleOffset + flutter;

        let proximity = 0;
        if (mouse.active) {
          const d = Math.hypot(node.x - mouse.x, node.y - mouse.y);
          if (d < CONFIG.mouseRadius) proximity = Math.pow(1 - d / CONFIG.mouseRadius, 1.5);
        }

        const len = leaf.baseLength * CONFIG.leafSizeMultiplier;
        const wid = leaf.baseWidth * CONFIG.leafSizeMultiplier;

        const petioleX = node.x + Math.cos(finalAngle) * leaf.petioleLen;
        const petioleY = node.y + Math.sin(finalAngle) * leaf.petioleLen;

        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(petioleX, petioleY);
        ctx.strokeStyle = CONFIG.stemColor;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        drawBotanicalLeaf(petioleX, petioleY, finalAngle, len, wid, proximity);
      }

      // Branch leaves
      if (vine.branch) {
        const b = vine.branch;
        for (let bl = 0; bl < b.leaves.length; bl++) {
          const bLeaf = b.leaves[bl];
          const bNode = b.nodes[bLeaf.nodeIndex];
          const bNextNode = b.nodes[Math.min(bLeaf.nodeIndex + 1, b.nodes.length - 1)];
          const bPrevNode = b.nodes[Math.max(bLeaf.nodeIndex - 1, 0)];

          const bTangent = Math.atan2(bNextNode.y - bPrevNode.y, bNextNode.x - bPrevNode.x);
          const bFlutter = Math.sin(time * CONFIG.leafFlutterSpeed + bLeaf.swayPhase) * 0.08;
          const bAngle = bTangent + bLeaf.angleOffset + bFlutter;

          let bProximity = 0;
          if (mouse.active) {
            const bd = Math.hypot(bNode.x - mouse.x, bNode.y - mouse.y);
            if (bd < CONFIG.mouseRadius) bProximity = Math.pow(1 - bd / CONFIG.mouseRadius, 1.5);
          }

          const bLen = bLeaf.baseLength * CONFIG.leafSizeMultiplier;
          const bWid = bLeaf.baseWidth * CONFIG.leafSizeMultiplier;

          const bPetioleX = bNode.x + Math.cos(bAngle) * bLeaf.petioleLen;
          const bPetioleY = bNode.y + Math.sin(bAngle) * bLeaf.petioleLen;

          ctx.beginPath();
          ctx.moveTo(bNode.x, bNode.y);
          ctx.lineTo(bPetioleX, bPetioleY);
          ctx.strokeStyle = CONFIG.stemColor;
          ctx.lineWidth = 0.6;
          ctx.stroke();

          drawBotanicalLeaf(bPetioleX, bPetioleY, bAngle, bLen, bWid, bProximity);
        }
      }
    }
  }

  /**
   * Resizes canvas to match the exact size of the #home hero section
   */
  function resizeToSection() {
    const rect = section.getBoundingClientRect();
    width = section.clientWidth || rect.width || window.innerWidth;
    height = section.clientHeight || rect.height || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    if (ctx.resetTransform) {
      ctx.resetTransform();
    } else {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.scale(dpr, dpr);

    initializeVines();
  }

  /**
   * Pointer tracking relative to the #home section
   */
  function handlePointer(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    // Check if cursor is inside the hero section
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;

      if (!mouse.active) {
        mouse.prevX = localX;
        mouse.prevY = localY;
      }
      mouse.x = localX;
      mouse.y = localY;
      mouse.active = true;
      mouse.lastActiveTime = Date.now();
    } else {
      mouse.active = false;
    }
  }

  window.addEventListener("pointermove", (e) => handlePointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener("touchmove", (e) => {
    if (e.touches.length > 0) handlePointer(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  window.addEventListener("pointerleave", () => { mouse.active = false; });
  window.addEventListener("touchend", () => { mouse.active = false; });

  // Watch for hero section size changes
  if (window.ResizeObserver) {
    new ResizeObserver(resizeToSection).observe(section);
  } else {
    window.addEventListener("resize", resizeToSection);
  }

  // Optimize performance: pause render loop when hero is scrolled out of view
  if (window.IntersectionObserver) {
    const visObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        isSectionVisible = e.isIntersecting;
      });
    }, { threshold: 0.05 });
    visObserver.observe(section);
  }

  // Animation Loop
  function animate(now) {
    if (isSectionVisible) {
      updatePhysics(now);
      render(now);
    }
    requestAnimationFrame(animate);
  }

  resizeToSection();
  requestAnimationFrame(animate);
})();