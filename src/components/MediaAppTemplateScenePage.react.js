/**
 * @providesModule MediaAppTemplateScenePage.react
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
  VrButton,
} from 'react-360';
import { UIManager, findNodeHandle } from 'react-native';
import {
  default as VideoModule, VideoPlayerInstance,
  type VideoStatusEvent
} from 'VideoModule';
import MediaAppTemplateInfoButton from "MediaAppTemplateInfoButton.react";
import MediaAppTemplateVideoScreen from 'MediaAppTemplateVideoScreen.react';

const { AudioModule } = NativeModules;

type Players = {
  scene: VideoPlayerInstance,
  screen: VideoPlayerInstance,
};

const TRANSITION_TIME = 500;

class MediaAppTemplateScenePage extends React.Component {
  _players: Players;
  _nextPlayers: Players;
  _preloadJob: ?Promise<void>;
  _preloading: boolean = false;
  state = {
    inTransition: false,
    count:0,
  };

  componentWillMount() {
    this._players = {
      scene: VideoModule.createPlayer(),
      screen: VideoModule.createPlayer(),
    };
    this._nextPlayers = {
      scene: VideoModule.createPlayer(),
      screen: VideoModule.createPlayer(),
    };
    this._renderScene(this.props);
  }

  componentWillReceiveProps(nextProps) {
    this._renderScene(nextProps);
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

  _onClickPrev = () => {
    this.props.onClickPrev && this.props.onClickPrev();
  }


  render() {
    const currentTitle = this.props.currentScene.title;
    const nextTitle = this.props.nextScene.title;
    const showScreen = !!(!this._preloading
      && !this.state.inTransition
      && this.props.currentScene.screen);

    const sceneButtons = [];
    let hello;
    let sceneButtoninfo = this.props.buttonInfo;
    let enterBackground = this.props.enterBackground;
    let currentSceneNumber = this.props.currentSceneNumber

    switch (currentSceneNumber) {
      case 0:
        sceneButtons.push(
          <View key={10} style={styles.scenePage}>
            <VrButton style={styles.buttonActive} onClick={this._onClickNext}>
              <Text style={styles.text}>Start an Interview </Text>
            </VrButton>
            <VrButton style={styles.buttonInActive}>
              <Text style={styles.text}> Previous Sessions </Text>
            </VrButton>
          </View>
        );
        break;
      case 1:
        sceneButtons.push(
          <View key={11} style={styles.scenePage3}>
            <View style={styles.QueMenuOpen}>
              <VrButton 
                style={styles.Questions} 
                onClick={this._onClickNext}
                onEnter={() => Environment.setBackgroundImage(asset("360_Zen.jpg"), { transition: 50 })}
                onExit={() => Environment.setBackgroundImage(asset("360_Office.jpg"), { transition: 50 })}
                >
                <Text style={styles.text}>General</Text>
              </VrButton>
              <VrButton style={styles.InQuestions}
                onEnter={() => Environment.setBackgroundImage(asset("360_Lisa.jpg"), { transition: 50 })}
                onExit={() => Environment.setBackgroundImage(asset("360_Office.jpg"), { transition: 50 })}
              >
                <Text style={styles.text}>Tech</Text>
              </VrButton>
              <VrButton style={styles.InQuestions}
                onEnter={() => Environment.setBackgroundImage(asset("360_Hassan.jpg"), { transition: 50 })}
                onExit={() => Environment.setBackgroundImage(asset("360_Office.jpg"), { transition: 50 })}
              >
                <Text style={styles.text}>Medical</Text>
              </VrButton>
              <VrButton style={styles.InQuestions}
                onEnter={() => Environment.setBackgroundImage(asset("360_Aysha.jpg"), { transition: 50 })}
                onExit={() => Environment.setBackgroundImage(asset("360_Office.jpg"), { transition: 50 })}
              >
                <Text style={styles.text}>Policing</Text>
              </VrButton>
            </View>
          </View>
        );
        break;
      case 2:
        sceneButtons.push(
          <View key={11} style={styles.scenePage3}>
            <View style={styles.QueMenuOpen}>
              <VrButton style={styles.Questions} onClick={this._onClickNext}>
                <Text style={styles.text}>Start</Text>
              </VrButton>
              <VrButton style={styles.Questions} onClick={this._onClickPrev}>
                <Text style={styles.text}>Go Back</Text>
              </VrButton>
              
            </View>
          </View>
        );
        break;
      case 3:
        let count = 60
        let boolean = true
        let timer = setInterval(function () {
          //if (count == 1) clearInterval(timer);
          count--
          console.log(count)
          
          if (count == 0) {
            boolean = false
            clearInterval(timer)
          };
          //return count
        }, 1000);
        sceneButtons.push(
          <View key={11} style={styles.scenePage3}>
            <View style={styles.QueMenuOpen}>
              <Text style={styles.text}>{count}</Text>
            </View>
          </View>
        );
        break;
        default:
    }

    //console.log(enterBackground)
    // for (const i = 0; i < this.props.buttonCount; i++) {
    //   //console.log(this.props.currentScene.sceneNumber)
    //   if (this.props.currentScene.sceneNumber === 2) {
    //     //console.log(enterBackground[i])
    //     sceneButtons.push(
    //       <MediaAppTemplateInfoButton
    //         key={i}
    //         onClick={this._onClickNext}
    //         onEnterforBackground={enterBackground[i]}
    //         // onExit={() => Environment.setBackgroundImage(asset("360_Zen.jpg"), { transition: 50 })}
    //         text={sceneButtoninfo[i]}
    //         width={300}
    //       />
    //     )
    //   } else {
    //     sceneButtons.push(
    //       <MediaAppTemplateInfoButton
    //         key={i}
    //         onClick={this._onClickNext}
    //         text={sceneButtoninfo[i]}
    //         width={300}
    //       />
    //     )
    //   }

    // }



    return (
      <View style={[styles.container, this.state.inTransition && { opacity: 0 }]} >
        <Text style={styles.title}>
          {currentTitle}
        </Text>
        {/* <MediaAppTemplateVideoScreen
          player={this._players.screen._player}
          style={styles.screen}
          visible={showScreen}
        /> */}
        {sceneButtons}

        {/* <MediaAppTemplateInfoButton
          onClick={this._onClickNext}
          text={`Go To: ${nextTitle}`}
          width={300}
        /> */}
      </View >
    );
  }
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    color: '#ffffff',
    textAlign: 'center',
  },
  screen: {
    width: 480,
    height: 320,
  },
  text: {
    textAlign: "center", alignItems: "center", color: "#000000"
  },
  text2: {
    textAlign: "left", alignItems: "center", color: "#FFFFFF",
    fontSize: 20,
  },
  panel: {
    width: 1000,
    height: 600,
    backgroundColor: "rgba(140, 140, 140, 0.0)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  section: {
    padding: 5,
    width: 750,
    backgroundColor: "#000000",
    borderColor: "#639dda",
    borderWidth: 2,
    flexDirection: "row"
  },
  buttonActive: {
    padding: 10, marginTop: 10,
    width: "30px",
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
  },
  buttonInActive: {
    padding: 10, marginTop: 10,
    width: "30px",
    backgroundColor: "#FFFFFF", backgroundColor: "rgba(140, 140, 140, 0.5)",
    borderRadius: 5,
  },
  scenePage: {
    width: 1000, height: 550,
    backgroundColor: "rgba(50, 50, 50, 0.5)",
    borderRadius: 5,
    justifyContent: 'center', alignItems: 'center',
  },
  scenePage2: {
    marginTop: 100,
    padding: 5,
    width: 1000,
    height: 300,
    backgroundColor: "rgba(50, 50, 50, 0.5)",
    borderRadius: 5,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  scenePage3: {
    padding: 5,
    width: 1000,
    height: 1000,
    backgroundColor: "rgba(50, 50, 50, 0.0)",
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scenePage4: {
    width: 300, height: 300, borderRadius: 5,
    justifyContent: 'center', alignItems: 'center',
  },
  menuButton: {
    width: 50, height: 50,
    position: 'absolute', right: 0,
  },
  QueMenuOpen: {
    padding: 5,
    width: 300, height: 350,
    position: 'absolute', right: 0,
    backgroundColor: "rgba(50, 50, 50, 0.5)",
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  Questions: {
    padding: 10, marginTop: 10, borderRadius: 5,
    width: "80px", backgroundColor: "#FFFFFF",
  },
  InQuestions: {
    padding: 10, marginTop: 10, borderRadius: 5,
    width: "80px", backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  icon: {
    padding: 20,
    height: '80%',
    aspectRatio: 1,
  },
  arrowsContainer: {
    width: 100, height: 50, padding: 10, borderRadius: 5,
    position: "relative", marginLeft: 900, marginTop: 500,
    backgroundColor: "rgba(50, 50, 50, 0.7)",
  },
  arrowRight: {
    width: 50, height: 50,
    position: 'absolute', right: 0, marginTop: 5
  },
  arrowLeft: {
    width: 50, height: 50,
    position: 'absolute', left: 0, marginTop: 5
  }
});

module.exports = MediaAppTemplateScenePage;
