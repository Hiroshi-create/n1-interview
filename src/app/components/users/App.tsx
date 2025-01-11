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
      <UI hidden={false} />
      <Canvas shadows camera={{ position: [0, 0, 1], fov: 30 }}>
        <Experience />
      </Canvas>
    </>
  );
}

export default App;
