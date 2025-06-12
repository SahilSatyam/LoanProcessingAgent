import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { format } from 'date-fns';

const MessageBubble = ({ message, isUser, timestamp }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 2,
          maxWidth: '70%',
          backgroundColor: isUser ? 'primary.main' : 'grey.100',
          color: isUser ? 'white' : 'text.primary',
          borderRadius: 2,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '50%',
            [isUser ? 'right' : 'left']: -8,
            transform: 'translateY(-50%)',
            borderStyle: 'solid',
            borderWidth: '8px 0 8px 8px',
            borderColor: isUser 
              ? 'transparent transparent transparent primary.main'
              : 'transparent transparent transparent grey.100',
            [isUser ? 'borderRight' : 'borderLeft']: 'none',
          },
        }}
      >
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {message}
        </Typography>
        {timestamp && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 1,
              opacity: 0.7,
              fontSize: '0.75rem',
              textAlign: isUser ? 'right' : 'left',
            }}
          >
            {format(new Date(timestamp), 'h:mm a')}
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default MessageBubble;
