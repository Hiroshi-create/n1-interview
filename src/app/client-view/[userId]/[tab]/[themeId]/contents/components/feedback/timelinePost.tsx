import React from "react";
import {
  Avatar,
  Stack,
  Typography,
  Grid,
  Button,
} from "@mui/material";
import { IconHeartFilled, IconMessage } from "@tabler/icons-react";
import TimelineItem from "@mui/lab/TimelineItem";
import TimelineSeparator from "@mui/lab/TimelineSeparator";
import TimelineConnector from "@mui/lab/TimelineConnector";
import TimelineContent from "@mui/lab/TimelineContent";
import TimelineDot from "@mui/lab/TimelineDot";

interface TimelinePostProps {
  avatar: string;
  name: string;
  time: string;
  content: React.ReactNode;
  images?: string[];
  hasConnector?: boolean;
}

const TimelinePost: React.FC<TimelinePostProps> = ({
  avatar,
  name,
  time,
  content,
  images,
  hasConnector = true,
}) => {
  return (
    <TimelineItem>
      <TimelineSeparator>
        <TimelineDot
          sx={{
            backgroundColor: "transparent",
            margin: 0,
            boxShadow: "none",
          }}
        >
          <Avatar src={avatar} alt="user" />
        </TimelineDot>
        {hasConnector && <TimelineConnector />}
      </TimelineSeparator>
      <TimelineContent>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6">{name}</Typography>
          <Typography variant="subtitle1" fontSize="12px">
            {time}
          </Typography>
        </Stack>
        {content}
        {images && (
          <Grid container spacing={3} mb={2}>
            {images.map((image, index) => (
              <Grid item xs={12} sm={4} lg={3} key={index}>
                <Avatar
                  src={image}
                  alt={`bg${index + 1}`}
                  sx={{ borderRadius: 0, width: "100%", height: 135 }}
                />
              </Grid>
            ))}
          </Grid>
        )}
        <Stack direction="row" spacing={1} mb={3}>
          <Button
            size="small"
            color="primary"
            startIcon={<IconMessage width={18} />}
          >
            Comments
          </Button>
        </Stack>
      </TimelineContent>
    </TimelineItem>
  );
};

export default TimelinePost;
