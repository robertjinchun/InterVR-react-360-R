/**
 * @providesModule BasicAppTemplateScenePage.react
 */
'use strict';

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  asset,
  NativeModules,
  Environment,
} from 'react-360';
import {default as VideoModule, VideoPlayerInstance, type VideoStatusEvent} from 'VideoModule';

import MediaAppTemplateInfoButton from "MediaAppTemplateInfoButton.react";
import MediaAppTemplateVideoScreen from 'MediaAppTemplateVideoScreen.react';

const {AudioModule} = NativeModules;

const DATA_BASE = [
  {
    type: 'photo',
    source: asset('360_Office.jpg'),
    list: [
      'Continue',
    ]
  },
  {
    type: 'video',
    source: { url: asset('video360.mp4').uri },
    //audio: asset('cafe.wav'),
    list: [
      'Body',
      'Coach',
    ]
  },
  {
    type: 'video',
    source: {url: asset('video360.mp4').uri},
    /* If you want to have muliple format of source
     and let browser choose the supported one
     try the following:
    source: [
      // Here we provide two format to the source so
      // if first format doesn't work, the second one
      // will be used.
      {url: asset('video360.mp4').uri},
      {url: asset('video360.webm').uri},
    ],
    */
    list: [
      'Building',
      'Tree',
      'Road',
    ]
  },
];

class BasicAppTemplateScenePage extends React.Component {
  static defaultProps = {
    index: 0,
  };
  _player: VideoPlayerInstance;
  _players: Players;
  _nextPlayers: Players;
  _preloadJob: ?Promise<void>;
  _preloading: boolean = false;
  state = {
    inTransition: false,
  };

  componentWillMount() {
    // create a play to play video
    this._player = VideoModule.createPlayer('myplayer');
    this._player.addListener('onVideoStatusChanged', this._onVideoStatus);
    this._setData(this.props);

        this._players = { 
      scene: VideoModule.createPlayer(), 
      screen: VideoModule.createPlayer(),
    };
    this._nextPlayers = { 
      scene: VideoModule.createPlayer(), 
      screen: VideoModule.createPlayer(),
    };
    // this._renderScene(this.props);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.index !== this.props.index) {
      this._setData(nextProps);
    }
    //this._renderScene(nextProps);
  }

  _onVideoStatus = (event: VideoStatusEvent) => {
    if (event.status === 'finished') {
      this._player.resume();
    }
  }

  _setData(nextProps) {
    const data = DATA_BASE[nextProps.index];
    if (data.type == 'photo') {
      // display background 360 photo
      Environment.setBackgroundImage(data.source, {format: '2D'});
    } else {
      // play background 360 video
      // Two steps:
      // 1. play video on the player
      // 2. set enviroment to the player
      this._player.play({
        source: data.source,
        // un-muted won't work with Android right now
        // will be solved later
        // muted: false,
      });
      Environment.setBackgroundVideo('myplayer');
    }
    if (data.audio) {
      // play an environmental audio
      AudioModule.playEnvironmental({
        source: data.audio,
        volume: 0.5,
      });
    } else {
      AudioModule.stopEnvironmental();
    }

    this.setState({data: data});
  }

  _preloadVideo(player, source) {
    // Video can be preloaded by calling `play()`
    // on a video player that is not attached to the environment or a screen
    // with `muted=true` and `autoPlay=false`.
    // Here we are swaping two sets of video players, one set for displaying
    // another set for preloading.
    // You can listen to the 'onVideoStatusChanged' event to check when
    // the loading is done.
    return new Promise((resolve, reject) => {
      const onVideoLoadedSubscription =
        player.addListener('onVideoStatusChanged', (event: VideoStatusEvent) => {
          if (event.status === 'ready') {
            player.removeSubscription(onVideoLoadedSubscription);
            resolve();
          }
        });
      player.play({
        source: source,
        muted: true,
        autoPlay: false,
      });
    });
  }

  _preloadScene(data) {
    const promises = [];
    if (data.type == 'photo') {
      // Preload the background 360 photo
      // Calling setBackgroundImage while the photo is still preloading is fine,
      // it will keep on loading and display the background image when it's done.
      Environment.preloadBackgroundImage(data.source, { format: '2D' });
      promises.push(Promise.resolve());
    } else {
      // Preload the background 360 video
      promises.push(this._preloadVideo(this._nextPlayers.scene, data.source));
    }

    if (data.screen) {
      // Preload the rectilinear video on the screen.
      promises.push(this._preloadVideo(this._nextPlayers.screen, data.screen));
    }

    return Promise.all(promises);
  }

  _renderScene(nextProps) {
    const data = nextProps.currentScene;
    this._preloading = true;
    const loadScene = () => {
      this._preloading = false;
      // video player clean up work
      this._players.scene.stop();
      this._players.screen.stop();
      // swap the players for next preload
      const temp = this._players;
      this._players = this._nextPlayers;
      this._nextPlayers = temp;

      // render current scene
      if (data.type == 'photo') {
        // display background 360 photo
        Environment.setBackgroundImage(data.source, { format: '2D', transition: TRANSITION_TIME });
      } else {
        // calling resume will start playing the already preloaded video
        this._players.scene.resume();
        Environment.setBackgroundVideo(this._players.scene._player, { transition: TRANSITION_TIME });
      }

      this.setState({ inTransition: true });
      setTimeout(() => { this.setState({ inTransition: false }); }, TRANSITION_TIME);

      if (data.screen) {
        this._players.screen.resume();
      }

      if (data.audio) {
        // play an environmental audio
        AudioModule.playEnvironmental({
          source: data.audio,
          volume: 0.5,
        });
      } else {
        AudioModule.stopEnvironmental();
      }

      // preload next scene
      const nextData = nextProps.nextScene;
      this._preloadJob = this._preloadScene(nextData);
    };

    if (this._preloadJob != null) {
      this._preloadJob.then(loadScene);
    } else {
      this._preloadScene(data).then(loadScene);
    }
  }

  _onClickNext = () => {
    this.props.onClickNext && this.props.onClickNext();
  }

  render() {

    const data = this.state.data;
    // const currentTitle = this.props.currentScene.title;
    const nextTitle = this.props.nextScene.title;
    // const showScreen = !!(!this._preloading && !this.state.inTransition && this.props.currentScene.screen);


    const list = [];
    for (const i = 0; i < data.list.length; i++) {
      list.push(
        <View
          key={i}
          style={styles.listView}>
          <Text style={styles.listText}
            onClick={this._onClickNext}>
            {data.list[i]}
          </Text>
          <MediaAppTemplateInfoButton
            onClick={this._onClickNext}
            text={`Go To: ${nextTitle}`}
            width={300}
          />
        </View>);
    }
    return (
      <View style={styles.container}>
        {list}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listView: {
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'white',
    borderWidth: 4,
    borderRadius: 10,
    height: 60,
    paddingHorizontal: 20,
    margin: 20,
  },
  listText: {
    fontSize: 50,
    color: 'black',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});

module.exports = BasicAppTemplateScenePage;
