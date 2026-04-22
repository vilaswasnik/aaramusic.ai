import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

interface ApiFallbackBannerProps {
  onRetry?: () => void | Promise<void>;
}

export const ApiFallbackBanner: React.FC<ApiFallbackBannerProps> = ({ onRetry }) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetryPress = async () => {
    if (!onRetry || isRetrying) return;
    setIsRetrying(true);
    try {
      await Promise.resolve(onRetry());
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Some music services are unavailable. Showing backup songs right now.
      </Text>
      {onRetry && (
        <TouchableOpacity
          style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
          onPress={handleRetryPress}
          activeOpacity={0.8}
          disabled={isRetrying}
        >
          {isRetrying ? (
            <View style={styles.retryingRow}>
              <ActivityIndicator size="small" color="#FFF3C4" />
              <Text style={styles.retryButtonText}>Retrying...</Text>
            </View>
          ) : (
            <Text style={styles.retryButtonText}>Retry</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 183, 3, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 183, 3, 0.45)',
  },
  text: {
    color: '#FFE082',
    fontSize: 13,
    fontWeight: '600',
  },
  retryButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 224, 130, 0.2)',
    borderColor: 'rgba(255, 224, 130, 0.6)',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  retryButtonDisabled: {
    opacity: 0.7,
  },
  retryingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  retryButtonText: {
    color: '#FFF3C4',
    fontSize: 12,
    fontWeight: '700',
  },
});
