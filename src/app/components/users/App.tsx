import React from 'react';
import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { UI } from '../avatar/UI';
import { Experience } from '../avatar/Experience';

const App: React.FC = () => {
  return (
    <>
      <Loader />
      <Leva hidden={true} />
      {/* <Canvas style={{ width: '100%', height: '100vh', position: 'absolute', right: 0, top: 0 }} camera={{ position: [0, 4, 1], fov: 32 }}>
        <Experience />
      </Canvas> */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <UI hidden={true} />
      </div>
    </>
  );
};

export default App;
