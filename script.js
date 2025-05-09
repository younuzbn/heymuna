document.addEventListener('DOMContentLoaded', () => {
  // Get the container element
  const container = document.getElementById('particle-container');
  
  // Three.js setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  
  renderer.setSize(window.innerWidth, window.innerHeight);
  // Make renderer transparent to show background
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);
  
  // Position camera - adjust based on screen size
  const isMobile = window.innerWidth < 768;
  camera.position.z = isMobile ? 550 : 350; // Move camera further back on mobile
  
  // Reference variables
  let particleSystem;
  let originalPositions;
  let bulbPositions;
  let scatterDirections = [];
  const mouse = new THREE.Vector2();
  const mouseSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 50);
  let isMouseActive = false;
  let isScattering = false;
  let scatterForce = 0;
  let lastScrollTime = 0;
  let shouldReform = true;
  let currentScrollPosition = 0;
  let inSection2 = false;
  
  // Get responsive scale factor based on screen width
  const getResponsiveScale = () => {
    // Base scale is 1 for desktop
    let scale = 1;
    
    // For smaller screens, reduce scale proportionally
    if (window.innerWidth < 768) {
      // Scale factor for mobile (roughly half the size on smallest phones)
      scale = Math.max(0.5, window.innerWidth / 768);
    }
    
    return scale;
  };
  
  // SVG paths for HEY logo (replaces the original logo)
  const logoPaths = [
    'M0.045455 94V0.909088H22.5455V38.2727H59.2273V0.909088H81.6818V94H59.2273V56.5909H22.5455V94H0.045455ZM95.7955 94V0.909088H160.705V19.1818H118.295V38.2727H157.386V56.5909H118.295V75.7273H160.705V94H95.7955ZM170.159 0.909088H195.295L214.977 39.8636H215.795L235.477 0.909088H260.614L226.568 62.9091V94H204.205V62.9091L170.159 0.909088Z'
  ];
  
  // SVG paths for MUNA (replaces bulb)
  const munaPaths = [
    'M0.045455 0.909088H27.9091L51.5455 58.5455H52.6364L76.2727 0.909088H104.136V94H82.2273V36.8182H81.4546L59.0909 93.4091H45.0909L22.7273 36.5H21.9545V94H0.045455V0.909088ZM174.489 0.909088H196.943V60.9545C196.943 67.8939 195.292 73.9394 191.989 79.0909C188.686 84.2121 184.08 88.1818 178.17 91C172.261 93.7879 165.398 95.1818 157.58 95.1818C149.67 95.1818 142.761 93.7879 136.852 91C130.943 88.1818 126.352 84.2121 123.08 79.0909C119.807 73.9394 118.17 67.8939 118.17 60.9545V0.909088H140.67V59C140.67 62.2121 141.367 65.0758 142.761 67.5909C144.186 70.1061 146.17 72.0758 148.716 73.5C151.261 74.9242 154.216 75.6364 157.58 75.6364C160.943 75.6364 163.883 74.9242 166.398 73.5C168.943 72.0758 170.928 70.1061 172.352 67.5909C173.777 65.0758 174.489 62.2121 174.489 59V0.909088ZM290.273 0.909088V94H271.182L234.136 40.2727H233.545V94H211.045V0.909088H230.409L267.045 54.5455H267.818V0.909088H290.273ZM324.557 94H300.375L331.784 0.909088H361.739L393.148 94H368.966L347.102 24.3636H346.375L324.557 94ZM321.33 57.3636H371.875V74.4545H321.33V57.3636Z'
  ];
  
  // Get points from HEY logo SVG paths
  const getLogoPoints = () => {
    const offscreenCanvas = document.createElement('canvas');
    const context = offscreenCanvas.getContext('2d');
    offscreenCanvas.width = 1000;
    offscreenCanvas.height = 1500;
    
    if (!context) return [];
  
    // Fill the paths with white to sample later
    context.scale(3, 3);
    context.fillStyle = 'white';
    
    logoPaths.forEach(path => {
      const pathData = new Path2D(path);
      context.fill(pathData);
    });
    
    // Sample points from the image in a grid pattern
    const imgData = context.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    const validPoints = [];
    
    const gridSpacing = 7;
    
    function randomOffset() {
      return (Math.random() - 0.5) * gridSpacing * 0.0;
    }
    
    // Adjusted for the HEY SVG size (261x94)
    const svgWidth = 261;
    const svgHeight = 94;
    const xOffset = svgWidth / 2;
    const yOffset = svgHeight / 2;
    
    // Get responsive scale for mobile
    const responsiveScale = getResponsiveScale();
    
    for (let y = 0; y < offscreenCanvas.height; y += gridSpacing) {
      for (let x = 0; x < offscreenCanvas.width; x += gridSpacing) {
        const i = (y * offscreenCanvas.width + x) * 4;
        if (imgData.data[i] > 0) {
          validPoints.push({
            x: (x / 3 - xOffset + randomOffset()) * responsiveScale,
            y: (-y / 3 + yOffset + randomOffset()) * responsiveScale
          });
        }
      }
    }
    
    return validPoints;
  };
  
  // Function to extract points from MUNA SVG paths
  const extractMunaPoints = (svgPaths) => {
    const offscreenCanvas = document.createElement('canvas');
    const context = offscreenCanvas.getContext('2d');
    offscreenCanvas.width = 1000;
    offscreenCanvas.height = 1500;
    
    if (!context) return [];
  
    // Fill the paths with white to sample later
    context.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    context.fillStyle = 'white';
    
    // Scale the canvas appropriately for the MUNA shape (394x96)
    context.resetTransform();
    context.scale(2, 2);
    context.translate(100, 10); // Adjusted translation to better center the MUNA shape
    
    svgPaths.forEach(path => {
      const pathData = new Path2D(path);
      context.fill(pathData);
    });
    
    // Sample points from the image in a grid pattern
    const imgData = context.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    const validPoints = [];
    
    const gridSpacing = 7;
    
    const randomOffset = () => (Math.random() - 0.5) * gridSpacing * 0.0;
    
    // Adjusted for the MUNA SVG size (394x96)
    const svgWidth = 394;
    const svgHeight = 96;
    const xOffset = svgWidth / 2;
    const yOffset = svgHeight / 2;
    
    // Get responsive scale for mobile
    const responsiveScale = getResponsiveScale();
    
    for (let y = 0; y < offscreenCanvas.height; y += gridSpacing) {
      for (let x = 0; x < offscreenCanvas.width; x += gridSpacing) {
        const i = (y * offscreenCanvas.width + x) * 4;
        if (imgData.data[i] > 0) {
          validPoints.push({
            x: (x / 3 - xOffset + randomOffset()) * responsiveScale,
            y: (-y / 3 + yOffset + randomOffset()) * responsiveScale
          });
        }
      }
    }
    
    return validPoints;
  };
  
  // Create the particle system
  const createParticleSystem = () => {
    // Extract points for both shapes
    const logoPoints = getLogoPoints();
    const munaPoints = extractMunaPoints(munaPaths);
    
    console.log(`HEY logo points: ${logoPoints.length}, MUNA points: ${munaPoints.length}`);
    
    // Create particle system using the original number of points
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(logoPoints.length * 3);
    const colors = new Float32Array(logoPoints.length * 3);
    originalPositions = new Float32Array(logoPoints.length * 3);
    bulbPositions = new Float32Array(logoPoints.length * 3);
    
    // Get responsive scale for MUNA shape scaling
    const responsiveScale = getResponsiveScale();
    const munaScaleFactor = isMobile ? 1.5 : 2.1; // Smaller scaling for mobile
    
    // Fill both position arrays
    for (let i = 0; i < logoPoints.length; i++) {
      const logoPoint = logoPoints[i];
      
      // Initial position (HEY logo)
      positions[i * 3] = logoPoint.x;
      positions[i * 3 + 1] = logoPoint.y;
      positions[i * 3 + 2] = 0;
      
      // Original HEY logo positions
      originalPositions[i * 3] = logoPoint.x;
      originalPositions[i * 3 + 1] = logoPoint.y;
      originalPositions[i * 3 + 2] = 0;
      
      // Particle colors
      colors[i * 3] = 0.5;
      colors[i * 3 + 1] = 0.5;
      colors[i * 3 + 2] = 0.5;
    }
    
    // Map the MUNA points to match the HEY logo point count
    for (let i = 0; i < logoPoints.length; i++) {
      let munaPoint;
      
      if (munaPoints.length > 0) {
        // Map index to available MUNA points
        const munaIndex = Math.floor((i / logoPoints.length) * munaPoints.length);
        munaPoint = munaPoints[Math.min(munaIndex, munaPoints.length - 1)];
      } else {
        munaPoint = { x: 0, y: 0 };
      }
      
      // MUNA positions for morphing - scale and center
      bulbPositions[i * 3] = munaPoint.x * munaScaleFactor; // Scaled for mobile
      bulbPositions[i * 3 + 1] = munaPoint.y * munaScaleFactor; // Scaled for mobile
      bulbPositions[i * 3 + 2] = 0;
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Adjust particle size based on screen size
    const particleSize = isMobile ? 1.2 : 1.7;
    
    const particleMaterial = new THREE.PointsMaterial({
      size: particleSize,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });
    
    particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);
    
    // Initialize scatter directions
    scatterDirections = Array(logoPoints.length).fill(0).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const strength = 0.5 + Math.random() * 1.5;
      return {
        x: Math.cos(angle) * strength,
        y: Math.sin(angle) * strength,
        z: (Math.random() - 0.5) * 2
      };
    });
  };
  
  // Function to check if we should reform the logo based on scroll position
  const checkShouldReform = () => {
    // Get the current scroll position
    const scrollY = window.scrollY;
    
    // Calculate section heights more precisely
    const viewportHeight = window.innerHeight;
    const section1Height = viewportHeight * 0.8; // 80vh (Section1)
    
    // Section2 starts after Section1
    const section2Start = section1Height;
    
    // We want to form the logo when:
    // 1. At the top of the page (Section1)
    // 2. When we're in Section2
    const tolerance = viewportHeight * 0.1;
    
    const inSection1 = scrollY < tolerance;
    const inSection2Now = scrollY > section2Start + tolerance;
    
    shouldReform = inSection1 || inSection2Now;
    inSection2 = inSection2Now;
    
    // Debug logging to help understand the scroll position
    console.log(`Scroll: ${scrollY}, Section2 starts at: ${section2Start}, Should reform: ${shouldReform}, In Section2: ${inSection2}`);
    
    // Check if we're scrolling and not at a reform point
    if (!shouldReform && Math.abs(scrollY - currentScrollPosition) > 5) {
      // We're scrolling and not at a reform point, so scatter
      isScattering = true;
      scatterForce = Math.min(scatterForce + 2.0, 25); // Increased force increment and max value
    }
    
    // Store current position for next check
    currentScrollPosition = scrollY;
  };
  
  // Event handlers
  const handleMouseMove = (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
    vector.unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));
    
    mouseSphere.center.copy(pos);
    isMouseActive = true;
  };
  
  const handleMouseOut = () => {
    isMouseActive = false;
  };
  
  const handleWheel = (event) => {
    const scrollDelta = Math.abs(event.deltaY);
    const now = Date.now();
    
    if (now - lastScrollTime > 200) {
      scatterForce = 0;
    }
    
    checkShouldReform();
    
    if (!shouldReform) {
      scatterForce += scrollDelta * 0.01; // Doubled the scroll sensitivity
      scatterForce = Math.min(scatterForce, 25); // Increased max scatter force
      isScattering = true;
    }
    
    lastScrollTime = now;
  };
  
  // Add a scroll event listener for more precise control
  const handleScroll = () => {
    checkShouldReform();
  };
  
  const handleResize = () => {
    const newIsMobile = window.innerWidth < 768;
    
    // Update camera position if mobile state changed
    if (newIsMobile !== isMobile) {
      camera.position.z = newIsMobile ? 550 : 350;
    }
    
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // If screen size changes significantly, recreate particle system
    if (Math.abs(window.innerWidth - lastWidth) > 200) {
      // Remove old particle system
      if (particleSystem) {
        scene.remove(particleSystem);
        particleSystem.geometry.dispose();
        particleSystem.material.dispose();
      }
      
      // Create new properly scaled particle system
      createParticleSystem();
      lastWidth = window.innerWidth;
    }
    
    // Recalculate reform points on resize
    checkShouldReform();
  };
  
  // Keep track of screen width for resize handling
  let lastWidth = window.innerWidth;
  
  // Add event listeners
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseout', handleMouseOut);
  window.addEventListener('wheel', handleWheel);
  window.addEventListener('scroll', handleScroll);
  window.addEventListener('resize', handleResize);
  
  // Initial setup
  createParticleSystem();
  checkShouldReform();
  
  // Animation loop
  const animate = () => {
    requestAnimationFrame(animate);
    
    if (!particleSystem) return;
  
    const positions = particleSystem.geometry.attributes.position.array;
    
    if (isScattering) {
      for (let i = 0; i < positions.length / 3; i++) {
        const dir = scatterDirections[i];
        
        positions[i * 3] += dir.x * scatterForce * 0.2; // Doubled the movement speed
        positions[i * 3 + 1] += dir.y * scatterForce * 0.2; // Doubled the movement speed
        positions[i * 3 + 2] += dir.z * scatterForce * 0.2; // Doubled the movement speed
      }
      
      // Only reduce force if we should reform
      if (shouldReform) {
        scatterForce *= 0.55; // Even faster reduction (was 0.9)
        if (scatterForce < 0.1) {
          isScattering = false;
          scatterForce = 0;
        }
      }
    } else if (isMouseActive) {
      for (let i = 0; i < positions.length / 3; i++) {
        const px = positions[i * 3];
        const py = positions[i * 3 + 1];
        const pz = positions[i * 3 + 2];
        
        const particlePos = new THREE.Vector3(px, py, pz);
        const distance = particlePos.distanceTo(mouseSphere.center);
        
        if (distance < mouseSphere.radius) {
          const repulsionDir = new THREE.Vector3().subVectors(particlePos, mouseSphere.center).normalize();
          const force = 1 - distance / mouseSphere.radius;
          const repulsionStrength = 15 * force;
          
          positions[i * 3] += repulsionDir.x * repulsionStrength;
          positions[i * 3 + 1] += repulsionDir.y * repulsionStrength;
        } else if (shouldReform) {
          // Return to the appropriate shape based on current section
          const targetPositions = inSection2 ? bulbPositions : originalPositions;
          const returnSpeed = 0.1;
          
          positions[i * 3] += (targetPositions[i * 3] - positions[i * 3]) * returnSpeed;
          positions[i * 3 + 1] += (targetPositions[i * 3 + 1] - positions[i * 3 + 1]) * returnSpeed;
          positions[i * 3 + 2] += (targetPositions[i * 3 + 2] - positions[i * 3 + 2]) * returnSpeed;
        }
      }
    } else if (shouldReform) {
      // Reform to the appropriate shape based on which section we're in
      const targetPositions = inSection2 ? bulbPositions : originalPositions;
      const returnSpeed = 0.1;
      
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3] += (targetPositions[i * 3] - positions[i * 3]) * returnSpeed;
        positions[i * 3 + 1] += (targetPositions[i * 3 + 1] - positions[i * 3 + 1]) * returnSpeed;
        positions[i * 3 + 2] += (targetPositions[i * 3 + 2] - positions[i * 3 + 2]) * returnSpeed;
      }
    }
    
    particleSystem.geometry.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
  };
  
  animate();
  
  // Handle section transitions with scroll
  const handleSectionTransitions = () => {
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    
    // Section 1 elements
    const section1Content = document.querySelector('.section-1 .section-content');
    
    // Section 2 elements
    const section2Title = document.querySelector('.section-2 h1');
    const section2Card = document.querySelector('.section-2 .info-card');
    
    // Calculate section boundaries
    const section1Height = viewportHeight * 0.88;
    const section2Start = section1Height;
    const section2Height = viewportHeight;
    const section3Start = section2Start + section2Height;
    
    // Handle Section 1 fade out
    if (scrollY <= section1Height * 0.6) {
      if (section1Content) section1Content.style.opacity = 1;
      if (section1Content) section1Content.style.transform = 'translateY(0)';
    } else if (scrollY >= section1Height * 0.9) {
      if (section1Content) section1Content.style.opacity = 0;
      if (section1Content) section1Content.style.transform = 'translateY(20px)';
    } else {
      const fadeProgress = (scrollY - section1Height * 0.6) / (section1Height * 0.3);
      if (section1Content) section1Content.style.opacity = 1 - fadeProgress;
      if (section1Content) section1Content.style.transform = `translateY(${fadeProgress * 20}px)`;
    }
    
    // Handle Section 2 fade in
    const scrollIntoSection2 = Math.max(0, scrollY - section2Start);
    
    if (scrollIntoSection2 <= section2Height * 0.0) {
      if (section2Title) section2Title.style.opacity = 0;
      if (section2Title) section2Title.style.transform = 'translateY(10px)';
      if (section2Card) section2Card.style.opacity = 0;
    } else if (scrollIntoSection2 >= section2Height * 0.2) {
      if (section2Title) section2Title.style.opacity = 1;
      if (section2Title) section2Title.style.transform = 'translateY(0)';
      if (section2Card) section2Card.style.opacity = 1;
    } else {
      const fadeProgress = scrollIntoSection2 / (section2Height * 0.2);
      if (section2Title) section2Title.style.opacity = fadeProgress;
      if (section2Title) section2Title.style.transform = `translateY(${10 * (1 - fadeProgress)}px)`;
      if (section2Card) section2Card.style.opacity = fadeProgress;
    }
  };
  
  // Add scroll event listener for section transitions
  window.addEventListener('scroll', handleSectionTransitions);
  // Initial check
  handleSectionTransitions();
}); 