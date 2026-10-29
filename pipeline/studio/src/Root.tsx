import React from "react";
import { Composition } from "remotion";
import { Episode, calculateEpisodeMetadata } from "./Episode";
import { RigSheet } from "./RigSheet";

export const Root: React.FC = () => (
  <>
    <Composition
      id="Episode"
      component={Episode}
      defaultProps={{ episodeId: "001-tickle" }}
      calculateMetadata={calculateEpisodeMetadata}
      durationInFrames={1}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition id="RigSheet" component={RigSheet} durationInFrames={1} fps={30} width={1080} height={1920} />
  </>
);
