import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function Lighting() {
  const spotLightRef = useRef<THREE.SpotLight>(null);

  useFrame((state) => {
    if (spotLightRef.current) {
      const time = state.clock.elapsedTime;
      spotLightRef.current.position.x = Math.sin(time * 0.3) * 5;
      spotLightRef.current.position.z = Math.cos(time * 0.3) * 5 - 10;
    }
  });

  return (
    <>
      {/* Ambient Light */}
      <ambientLight intensity={0.3} color="#ffffff" />

      {/* Main Spotlight on Screen */}
      <spotLight
        ref={spotLightRef}
        position={[0, 20, -10]}
        angle={0.5}
        penumbra={0.5}
        intensity={2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        color="#8247e5"
      />

      {/* Side Accent Lights */}
      <pointLight position={[-15, 10, -5]} intensity={1} color="#00d395" distance={30} />
      <pointLight position={[15, 10, -5]} intensity={1} color="#ff4757" distance={30} />

      {/* Floor Accent Lights */}
      <pointLight position={[-10, 2, 10]} intensity={0.5} color="#8247e5" distance={15} />
      <pointLight position={[10, 2, 10]} intensity={0.5} color="#8247e5" distance={15} />

      {/* Back Lighting */}
      <pointLight position={[0, 5, 20]} intensity={0.8} color="#ffffff" distance={40} />

      {/* Rim Light */}
      <directionalLight
        position={[0, 15, -20]}
        intensity={0.5}
        color="#c084fc"
        castShadow
      />
    </>
  );
}
